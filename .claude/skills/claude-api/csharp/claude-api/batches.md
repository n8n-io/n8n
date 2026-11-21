# Message Batches - C#

## Message Batches API

```csharp
var batch = await client.Messages.Batches.Create(new() {
    Requests = [
        new() { CustomID = "req-1", Params = new() { Model = "claude-opus-5-5", MaxTokens = 1024, Messages = [...] } },
    ],
});
// Poll client.Messages.Batches.Retrieve(batch.ID) until ProcessingStatus == "ended",
// then iterate client.Messages.Batches.Results(batch.ID).
```

