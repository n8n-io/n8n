# task-runner-launcher

[![codecov](https://codecov.io/gh/n8n-io/task-runner-launcher/graph/badge.svg?token=NW1BW05Q5P)](https://codecov.io/gh/n8n-io/task-runner-launcher)

CLI utility to launch an [n8n task runner](https://docs.n8n.io/hosting/configuration/task-runners/) in `external` mode. The launcher's purpose is to minimize resource use by launching a runner on demand, i.e. only when no runner is available and when a task is ready for pickup. It also makes sure the runner stays responsive and recovers from crashes.

```
./task-runner-launcher javascript
2024/11/29 13:37:46 INFO  Starting launcher...
2024/11/29 13:37:46 DEBUG Changed into working directory
2024/11/29 13:37:46 DEBUG Prepared env vars for runner
2024/11/29 13:37:46 INFO  Waiting for task broker to be ready...
2024/11/29 13:37:46 DEBUG Task broker is ready
2024/11/29 13:37:46 DEBUG Fetched grant token for launcher
2024/11/29 13:37:46 DEBUG Launcher's runner ID: fc6c24b9f764ae55
2024/11/29 13:37:46 DEBUG Connected: ws://127.0.0.1:5679/runners/_ws?id=fc6c24b9f764ae55
2024/11/29 13:37:46 DEBUG <- Received message `broker:inforequest`
2024/11/29 13:37:46 DEBUG -> Sent message `runner:info`
2024/11/29 13:37:46 DEBUG <- Received message `broker:runnerregistered`
2024/11/29 13:37:46 DEBUG -> Sent message `runner:taskoffer` for offer ID `5990b980a04945bd`
2024/11/29 13:37:46 INFO  Waiting for launcher's task offer to be accepted...
```

## Sections

- [Setup](docs/setup.md) - how to set up the launcher in a production environment
- [Development](docs/development.md) - how to set up a development environment to work on the launcher
- [Release](docs/release.md) - how to release a new version of the launcher
- [Lifecycle](docs/lifecycle.md) - how the launcher works
