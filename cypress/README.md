## Debugging Flaky End-to-End Tests - Usage

To debug flaky end-to-end (E2E) tests, use the following command:

```bash
pnpm run debug:flaky:e2e -- <grep_filter> <burn_count>
```

**Parameters:**

* `<grep_filter>`: (Optional) A string to filter tests by their `it()` or `describe()` block titles, or by tags if using the `@cypress/grep` plugin. If omitted, all tests will be run.
* `<burn_count>`: (Optional) The number of times to run the filtered tests. Defaults to 5 if not provided.

**Examples:**

1.  **Run all tests tagged with `@CAT-726` ten times:**

    ```bash
    pnpm run debug:flaky:e2e -- @CAT-726 10
    ```

2.  **Run all tests containing "login" five times (default burn count):**

    ```bash
    pnpm run debug:flaky:e2e -- login
    ```

3.  **Run all tests five times (default grep and burn count):**

    ```bash
    pnpm run debug:flaky:e2e
    ```

**Important Note:**

* When using the `grep_filter`, Cypress still needs to *discover* all test files to determine which ones match the filter. This means that even if you're only running a small subset of tests, the initial test discovery process might take some time, especially in larger projects. Therefore, it might seem slow to get to the tests you actually want to run.