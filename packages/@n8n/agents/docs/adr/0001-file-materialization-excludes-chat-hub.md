# File materialization does not include Chat Hub

Product Agents and Instance AI share a Workspace, so Output Files are a Workspace concern. Chat Hub already has artifacts and has no Workspace. We keep that product out of this design so we do not couple two file models.

**Considered Options**: Reuse Chat Hub artifacts as the user-facing file surface; unify all three products in one gallery.

**Consequences**: Chat Hub “artifact” stays Chat Hub-only. New work uses Output File, not artifact.
