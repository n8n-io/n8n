#!/usr/bin/env python3
"""Serve the live page of a feature test run, then its report.

  live_page.py --run-dir <run-dir> [--parent-pid <pid>] [--port <port>]

run.py starts it in the background. It uses the server of testmax-n8n-ai
(live_server.py): 127.0.0.1 only, the address in <run-dir>/live-url.txt, and it stops
30 minutes after the last request when the run is done. When verdicts.json changes after the
run, the page builds the report again, and the open report reloads.
"""

import argparse
import threading
import time
from pathlib import Path

import common  # noqa: F401  (puts the shared scripts on the import path)
import report
from live_server import read_status, serve
from report import ScenarioApp


def rebuild_on_verdicts(run_dir):
	verdicts, built = run_dir / 'verdicts.json', None
	while True:
		time.sleep(2)
		if read_status(run_dir).get('phase') != 'done' or not verdicts.exists():
			continue
		mtime = verdicts.stat().st_mtime
		if mtime == built:
			continue
		try:
			report.build(run_dir)
			built = mtime
		except ValueError:
			# The judge is still writing the file. The next check reads it again.
			pass
		except Exception as e:
			print(f'cannot build the report: {e}', flush=True)
			built = mtime


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--run-dir', required=True)
	ap.add_argument('--parent-pid', type=int)
	ap.add_argument('--port', type=int, default=0)
	args = ap.parse_args()
	run_dir = Path(args.run_dir).resolve()
	threading.Thread(target=rebuild_on_verdicts, args=(run_dir,), daemon=True).start()
	serve(ScenarioApp(run_dir), args.parent_pid, args.port)


if __name__ == '__main__':
	main()
