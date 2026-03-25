# Reference

## Orchestration

```mermaid
sequenceDiagram
pwc-p ->> or8n-reporter: playwright list --report @currents/orchestration

Note over or8n-reporter: CURRENTS_PWCP_WSS_PORT
or8n-reporter ->> or8n-reporter: ConfigLoader -> setCurrentsConfig<br />skipConfigValidation: true


or8n-reporter ->> backend: create or8n session
backend -->> or8n-reporter: or8n session
or8n-reporter -->> pwc-p: ws://<creation-success>
pwc-p ->> pwc-p: TaskExecutor.runTaskLoop

loop while or8n task != null
    pwc-p ->> backend: create or8n task
    backend -->> pwc-p: or8n task
    pwc-p ->> pwc-p: TaskExecutor.runPWTask

    pwc-p ->> playwright-currents-reporter: test --project --spec

    Note over playwright-currents-reporter: CURRENTS_PWCP_WSS_PORT<br />CURRENTS_OR8N_SEND_RESULTS_TO_WSS<br />CURRENTS_TEST_SUITE_FILE<br />CURRENTS_PWC_CLI_CONFIG_PATH

    playwright-currents-reporter ->> playwright-currents-reporter: ConfigLoader -> setCurrentsConfig<br />skipConfigValidation: true

    playwright-currents-reporter -->> pwc-p: sendJSONSummaryToWSS() via

end
```

## Configuration

- `pwc` and `pwc-p` are CLI utils - they get CLI arguments which can have values set via env variables according to `Option` configuraiton.
- `pwc` and `pwc-p` serialize CLI flags and save it to `CURRENTS_PWC_CLI_CONFIG_PATH`
- `reporter-config` is the configuration that users provide via `playwright.config.ts`
- `c12` is the configurtion from `currents.config.ts` and alike
- reporters read the file contents from `CURRENTS_PWC_CLI_CONFIG_PATH` and merge the config using `setConfig()` function

```mermaid
graph TD;

    CliManager.cliOptions --> CURRENTS_PWC_CLI_CONFIG_PATH;


    pwc-->CliManager.cliOptions;
    pwc-p-->CliManager.cliOptions;


    CURRENTS_PWC_CLI_CONFIG_PATH --> main-reporter;
    CURRENTS_PWC_CLI_CONFIG_PATH --> discovery-reporter;


    reporter-config --> ConfigLoader;
    discovery-reporter --> ConfigLoader;
    main-reporter --> ConfigLoader;


    env-var --> pwc;
    flags --> pwc;

    env-var --> pwc-p;
    flags --> pwc-p;

    subgraph "setConfig()"
    ConfigLoader --> defaultConfig --> c12 --> reporter-configuration --> cli --> envVars;
    end


```

## Tips

- use `getConfig` whenever it's possible
- don't use defaults in CLI options - they will override c12 configuration, use `defaultConfig` instead
- you can access certain config values directly from source - for example `debug` or `inspect`
