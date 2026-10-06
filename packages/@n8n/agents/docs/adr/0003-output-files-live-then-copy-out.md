# Output Files copy on write, reconcile at Run end

The user needs to see Output Files while a Run is still producing them, and still download them if the Run fails or the Workspace dies. Copy each Output File into durable storage when it is written. Preview may read the Workspace during the Run. When the Run ends, reconcile the Output Directory with durable storage so the Session keeps the final set. After a durable copy exists, download does not need the Workspace.

**Considered Options**: Durable copy only at successful Run end; copy only at any terminal Run state; live sandbox listing with no durable copy.
