# Pausing n8n with CRIU — scale-to-zero experiment summary

## 1. The problem

- An idle n8n instance holds about 1.2 GB of RAM (measured in a cloud pod) while doing nothing between requests.
- Across the cloud fleet, most instances are idle most of the time, so instance density is capped by idle memory rather than by actual work.
- Restarting n8n on demand instead of keeping it in memory is too slow: roughly 15 seconds, even with a migrated database already on disk.

## 2. The proposed solution

- CRIU (Checkpoint/Restore In Userspace) can freeze a whole process tree into a ~500–900 MB image on disk and restore it later in 0.2–0.6 seconds, with all state intact — open connections, sockets, and warmed caches included.
- A small Go program (the "activator") runs in front of n8n and forwards incoming requests to it. When n8n has been idle for a while, the activator dumps the n8n process, freeing all of its memory. When the next request arrives, it restores n8n first and then hands the request over — the caller just sees a slightly slower response.
- Around that core:
  - Health and metrics endpoints are answered from a cache while n8n is suspended, so monitoring probes don't wake it.
  - A periodic heartbeat (by default: restore every 30 seconds, run for 2 seconds) gives schedule triggers and system tasks a chance to run.
  - n8n's logs are streamed into the pod logs.
- Status: this works end-to-end on a test cluster. The instance wakes in about half a second, survives kubelet probes, and is woken by real browser traffic.

## 3. Unsolved issues

- The activator runs as root in a privileged container. The target is a locked-down setup with only the specific capabilities CRIU needs plus a custom seccomp profile.
- n8n cannot yet say "it's safe to dump me now". The activator only sees HTTP idleness, not running executions — freezing mid-execution means side effects land late, on the next wake.
- n8n cannot yet say "wake me at time T" for its next cron occurrence or waiting executions. The periodic heartbeat is a blunt polling substitute for that.
- A failed restore currently means the container restarts; there is no fallback to a cold start.
- The external task-runner sidecar crash-loops while n8n is suspended. Everything still works, but it's noisy — internal-runner mode is what has actually been tested.
- Restore speed is limited by node disk throughput (Azure caps VM disk writes at roughly 250 MB/s, and faster disk SKUs don't lift that cap). We need to figure out how to get fast local disks into the node pool.
- n8n's `/metrics` scrape throws an error after a restore because prom-client's CPU counter appears to go backwards. This is cosmetic and belongs upstream.

## 4. Future work

- Use the same trick to fast-start task runners and workers — smaller images and higher churn make them arguably a better fit than the main instance.
- Define an n8n-aware protocol so the instance can report its dumpable state and its next wake-up time to the activator.
- Improve restore latency: fast local disks in the node pool, and otherwise CRIU's lazy-pages mode, which starts serving immediately and pages memory in on demand.
- Work out fleet-level coordination: how many suspended instances can share a node, and how to stagger wake-ups.
- Establish a proper security posture and drop root/privileged.

## 5. Learnings (for the curious)

- A suspended n8n costs 8 MB of memory instead of 1.2 GB.
- io_uring blocked local testing: Node ≥ 22.22 creates io_uring rings that CRIU cannot dump, and the old environment-variable off-switch is gone. Denying the `io_uring_setup` syscall via seccomp makes libuv fall back cleanly to epoll. In Kubernetes this is a non-issue — the default container seccomp profile already blocks io_uring — but privileged pods lose that profile, so the activator installs its own filter.
- Every CRIU flag we use maps to a real failure we hit: `--tcp-established` (the internal websocket), `--file-locks` (SQLite), `--ext-unix-sk` (systemd sockets), `--manage-cgroups=ignore`, the requirement that the dumped tree's root is a session leader, the `iptables` binary having to exist in the image, and the child's stdio needing to be plain files.
- Environment traps we ran into: the distro's CRIU was too old for new kernels (we build 4.2.1 from source), CRIU isn't packaged for Alpine/musl, n8n's hardened image ships no package manager, and the task-runner-launcher sidecar owns port 5680 inside the pod.
- Time behaves interestingly after a restore: `sleep` resumes with its remaining subjective time, Node timers fire one catch-up each against the jumped clock without backfilling missed runs, and cron libraries fire at most one late run before realigning.
- We investigated incremental dumps: an idle n8n dirties only about 5 MB per 10 seconds, so pre-dump deltas are tiny — but dirty-page tracking doesn't survive a restore, so our dump→restore→dump loop always rewrites the full image. Parked, since restores matter more than dumps.
- The density model: the ~500 MB image sits in reclaimable page cache, so a suspended instance's true memory floor is ~8 MB. Overcommit is governed by "peak simultaneously-awake instances × 1.2 GB < node RAM", and memory pressure resolves along a benign-to-ugly ladder: page-cache eviction, then kubelet eviction, then the kernel OOM killer.
