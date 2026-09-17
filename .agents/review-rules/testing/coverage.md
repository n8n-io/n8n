# Test coverage

Applies to: any package with a test suite.

Flag new behaviour that ships with no test — a service method, controller
route, node operation, store action, or composable. Coverage does not need to
be complete; core functionality and the critical path do.

Also flag a new or edited test whose assertion cannot tell the fixed behaviour
from the broken one, since the suite going green is then the only signal
anyone gets: a name stating the opposite of what is asserted, an assertion
that holds whether or not the invariant it names does, or a case duplicating a
sibling on the same path but for a mock the code never reads.

Do NOT flag:

- Exports, types, configuration objects, metadata, version files
- A percentage — the number is not the bar, the critical path is
- Edge cases a human reviewer is better placed to ask for
- A skipped test — `no-skipped-tests` already fails the build
- A change breaking an existing test elsewhere; the suite runs on every PR
