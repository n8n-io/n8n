# Post-build live test follow-up

Ask whether to run a live execution after mocked verification. Read when setup
completes and the latest verification used mocks or simulations.

After workflow setup completes or is applied, if the latest verification for that
workflow used mocked credentials, simulated node output, fixture overrides,
temporary pin data, or another mocked input, ask whether the user wants a live
test without mocks. Do not run the live test automatically.

This follow-up has priority over the error-workflow opt-in for a direct new
primary workflow. If both follow-ups are due, ask about the live/no-mock test
first and ask the error-workflow question only after the user has answered,
declined, or deferred the live/no-mock test follow-up.

If the user agrees, use the explicit live execution path (`executions(action="run")`
for a direct live run) and report the result separately from the earlier mocked
verification. If the user declines or defers, state what remains untested and do
not claim live end-to-end verification.
