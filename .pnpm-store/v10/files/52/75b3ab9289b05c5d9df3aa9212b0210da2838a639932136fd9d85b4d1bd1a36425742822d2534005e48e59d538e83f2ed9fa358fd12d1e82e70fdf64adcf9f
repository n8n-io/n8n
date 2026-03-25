# Coverage Reference

- User instruments the app to collect coverage
- User enables coverage fixtures

- We collect coverage data:

  - each attempt can have multiple pages, we merge
    those with `saveCoverageForTestAttempt`
    at `path.join(projectDir, `${testId}-${retry}.json`);`
  - we end up with a bunch of files for each test + attempt

- At the end of spec execution we merge and upload coverage data, see `SpecExecution.finish`:
