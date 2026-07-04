# Missing resources and infeasible work

How to handle empty resource lists and partial capability gaps during builds.

When `nodes(action="explore-resources")` returns no results for a required
resource:

1. If the resource can be represented as a user choice, use
   `placeholder('Select <resource>')` and let setup collect it after the build.
2. If the user explicitly asked you to create the resource and the node type
   definition has a safe create operation, build and verify that
   resource-creation workflow as part of the requested work.
3. Otherwise, leave the main workflow as a saved draft and mention the missing
   resource in the one-line completion summary.

For resources that cannot be created via n8n, explain clearly what the user
needs to create manually and what ID or value belongs in setup.

If part of the requested workflow is infeasible (no node or API for it, a source
that blocks automated access, an action that cannot be performed
programmatically, or a third-party API whose region/use-case coverage you have
not verified), do not quietly substitute a stand-in and present it as the
requested capability. Flag the substitution as an approximation that may not
work — and any unverified region/country support — and name that gap in the
one-line completion summary so the result is not mistaken for the original ask.
