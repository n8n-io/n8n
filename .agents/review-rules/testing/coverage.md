# Test coverage

Applies to: any package with a test suite.

Flag new behaviour that ships with no test — a service method, controller
route, node operation, store action, or composable. Coverage does not need to
be complete; core functionality and the critical path do.

Do NOT flag:

- Exports, types, configuration objects, metadata, version files
- A percentage — the number is not the bar, the critical path is
- Edge cases a human reviewer is better placed to ask for
- A skipped test — the `no-skipped-tests` ESLint rule already fails the build
