# Reference

<details><summary><code>client.<a href="/src/Client.ts">checkApiKey</a>() -> Cohere.CheckApiKeyResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Checks that the api key in the Authorization header is valid and active

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.checkApiKey();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**requestOptions:** `CohereClient.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

##

## V2

<details><summary><code>client.v2.<a href="/src/api/resources/v2/client/Client.ts">chatStream</a>({ ...params }) -> core.Stream<Cohere.StreamedChatResponseV2></code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Generates a message from the model in response to a provided conversation. To learn how to use the Chat API with Streaming and RAG follow our Text Generation guides.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.v2.chatStream({
    model: "string",
    messages: [
        {
            role: "user",
            content: "string",
        },
    ],
    tools: [
        {
            type: "function",
            function: {
                name: "string",
                description: "string",
                parameters: {
                    string: {
                        key: "value",
                    },
                },
            },
        },
    ],
    documents: ["string"],
    citationOptions: {
        mode: Cohere.CitationOptionsMode.Fast,
    },
    responseFormat: {
        type: "text",
    },
    safetyMode: Cohere.V2ChatStreamRequestSafetyMode.Contextual,
    maxTokens: 1,
    stopSequences: ["string"],
    temperature: 1.1,
    seed: 1,
    frequencyPenalty: 1.1,
    presencePenalty: 1.1,
    k: 1.1,
    p: 1.1,
    returnPrompt: true,
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.V2ChatStreamRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `V2.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.v2.<a href="/src/api/resources/v2/client/Client.ts">chat</a>({ ...params }) -> Cohere.ChatResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Generates a message from the model in response to a provided conversation. To learn how to use the Chat API with Streaming and RAG follow our Text Generation guides.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.v2.chat({
    model: "model",
    messages: [
        {
            role: "tool",
            toolCallId: "messages",
        },
    ],
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.V2ChatRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `V2.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.v2.<a href="/src/api/resources/v2/client/Client.ts">embed</a>({ ...params }) -> Cohere.EmbedByTypeResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

This endpoint returns text embeddings. An embedding is a list of floating point numbers that captures semantic information about the text that it represents.

Embeddings can be used to create text classifiers as well as empower semantic search. To learn more about embeddings, see the embedding page.

If you want to learn more how to use the embedding model, have a look at the [Semantic Search Guide](/docs/semantic-search).

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.v2.embed({
    model: "model",
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.V2EmbedRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `V2.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.v2.<a href="/src/api/resources/v2/client/Client.ts">rerank</a>({ ...params }) -> Cohere.V2RerankResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

This endpoint takes in a query and a list of texts and produces an ordered array with each text assigned a relevance score.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.v2.rerank({
    model: "model",
    query: "query",
    documents: ["documents"],
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.V2RerankRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `V2.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

## EmbedJobs

<details><summary><code>client.embedJobs.<a href="/src/api/resources/embedJobs/client/Client.ts">list</a>() -> Cohere.ListEmbedJobResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

The list embed job endpoint allows users to view all embed jobs history for that specific user.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.embedJobs.list();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**requestOptions:** `EmbedJobs.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.embedJobs.<a href="/src/api/resources/embedJobs/client/Client.ts">create</a>({ ...params }) -> Cohere.CreateEmbedJobResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

This API launches an async Embed job for a [Dataset](https://docs.cohere.com/docs/datasets) of type `embed-input`. The result of a completed embed job is new Dataset of type `embed-output`, which contains the original text entries and the corresponding embeddings.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.embedJobs.create({
    model: "model",
    datasetId: "dataset_id",
    inputType: Cohere.EmbedInputType.SearchDocument,
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.CreateEmbedJobRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `EmbedJobs.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.embedJobs.<a href="/src/api/resources/embedJobs/client/Client.ts">get</a>(id) -> Cohere.EmbedJob</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

This API retrieves the details about an embed job started by the same user.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.embedJobs.get("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the embed job to retrieve.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `EmbedJobs.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.embedJobs.<a href="/src/api/resources/embedJobs/client/Client.ts">cancel</a>(id) -> void</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

This API allows users to cancel an active embed job. Once invoked, the embedding process will be terminated, and users will be charged for the embeddings processed up to the cancellation point. It's important to note that partial results will not be available to users after cancellation.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.embedJobs.cancel("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the embed job to cancel.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `EmbedJobs.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

## Datasets

<details><summary><code>client.datasets.<a href="/src/api/resources/datasets/client/Client.ts">list</a>({ ...params }) -> Cohere.DatasetsListResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

List datasets that have been created.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.datasets.list();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.DatasetsListRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Datasets.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.datasets.<a href="/src/api/resources/datasets/client/Client.ts">create</a>(data, evalData, { ...params }) -> Cohere.DatasetsCreateResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Create a dataset by uploading a file. See ['Dataset Creation'](https://docs.cohere.com/docs/datasets#dataset-creation) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.datasets.create(fs.createReadStream("/path/to/your/file"), fs.createReadStream("/path/to/your/file"), {
    name: "name",
    type: Cohere.DatasetType.EmbedInput,
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**data:** `File | fs.ReadStream | Blob`

</dd>
</dl>

<dl>
<dd>

**evalData:** `File | fs.ReadStream | Blob | undefined`

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.DatasetsCreateRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Datasets.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.datasets.<a href="/src/api/resources/datasets/client/Client.ts">getUsage</a>() -> Cohere.DatasetsGetUsageResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

View the dataset storage usage for your Organization. Each Organization can have up to 10GB of storage across all their users.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.datasets.getUsage();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**requestOptions:** `Datasets.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.datasets.<a href="/src/api/resources/datasets/client/Client.ts">get</a>(id) -> Cohere.DatasetsGetResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Retrieve a dataset by ID. See ['Datasets'](https://docs.cohere.com/docs/datasets) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.datasets.get("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Datasets.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.datasets.<a href="/src/api/resources/datasets/client/Client.ts">delete</a>(id) -> Record<string, unknown></code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Delete a dataset by ID. Datasets are automatically deleted after 30 days, but they can also be deleted manually.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.datasets.delete("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Datasets.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

## Connectors

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">list</a>({ ...params }) -> Cohere.ListConnectorsResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Returns a list of connectors ordered by descending creation date (newer first). See ['Managing your Connector'](https://docs.cohere.com/docs/managing-your-connector) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.list();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.ConnectorsListRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">create</a>({ ...params }) -> Cohere.CreateConnectorResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Creates a new connector. The connector is tested during registration and will cancel registration when the test is unsuccessful. See ['Creating and Deploying a Connector'](https://docs.cohere.com/docs/creating-and-deploying-a-connector) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.create({
    name: "name",
    url: "url",
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.CreateConnectorRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">get</a>(id) -> Cohere.GetConnectorResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Retrieve a connector by ID. See ['Connectors'](https://docs.cohere.com/docs/connectors) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.get("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the connector to retrieve.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">delete</a>(id) -> Cohere.DeleteConnectorResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Delete a connector by ID. See ['Connectors'](https://docs.cohere.com/docs/connectors) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.delete("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the connector to delete.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">update</a>(id, { ...params }) -> Cohere.UpdateConnectorResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Update a connector by ID. Omitted fields will not be updated. See ['Managing your Connector'](https://docs.cohere.com/docs/managing-your-connector) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.update("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the connector to update.

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.UpdateConnectorRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.connectors.<a href="/src/api/resources/connectors/client/Client.ts">oAuthAuthorize</a>(id, { ...params }) -> Cohere.OAuthAuthorizeResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Authorize the connector with the given ID for the connector oauth app. See ['Connector Authentication'](https://docs.cohere.com/docs/connector-authentication) for more information.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.connectors.oAuthAuthorize("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The ID of the connector to authorize.

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.ConnectorsOAuthAuthorizeRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Connectors.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

## Models

<details><summary><code>client.models.<a href="/src/api/resources/models/client/Client.ts">get</a>(model) -> Cohere.GetModelResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Returns the details of a model, provided its name.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.models.get("command-r");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**model:** `string`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Models.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.models.<a href="/src/api/resources/models/client/Client.ts">list</a>({ ...params }) -> Cohere.ListModelsResponse</code></summary>
<dl>
<dd>

#### 📝 Description

<dl>
<dd>

<dl>
<dd>

Returns a list of models available for use. The list contains models from Cohere as well as your fine-tuned models.

</dd>
</dl>
</dd>
</dl>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.models.list();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.ModelsListRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Models.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

## /finetuning

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">listFinetunedModels</a>({ ...params }) -> Cohere.ListFinetunedModelsResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.listFinetunedModels();
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.FinetuningListFinetunedModelsRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">createFinetunedModel</a>({ ...params }) -> Cohere.CreateFinetunedModelResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.createFinetunedModel({
    name: "api-test",
    settings: {
        baseModel: {
            baseType: Cohere.BaseType.BaseTypeChat,
        },
        datasetId: "my-dataset-id",
    },
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `Cohere.FinetunedModel`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">getFinetunedModel</a>(id) -> Cohere.GetFinetunedModelResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.getFinetunedModel("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The fine-tuned model ID.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">deleteFinetunedModel</a>(id) -> Cohere.DeleteFinetunedModelResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.deleteFinetunedModel("id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — The fine-tuned model ID.

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">updateFinetunedModel</a>(id, { ...params }) -> Cohere.UpdateFinetunedModelResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.updateFinetunedModel("id", {
    name: "name",
    settings: {
        baseModel: {
            baseType: Cohere.BaseType.BaseTypeUnspecified,
        },
        datasetId: "dataset_id",
    },
});
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**id:** `string` — FinetunedModel ID.

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.FinetuningUpdateFinetunedModelRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">listEvents</a>(finetunedModelId, { ...params }) -> Cohere.ListEventsResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.listEvents("finetuned_model_id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**finetunedModelId:** `string` — The parent fine-tuned model ID.

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.FinetuningListEventsRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>

<details><summary><code>client.finetuning.<a href="/src/api/resources/finetuning/client/Client.ts">listTrainingStepMetrics</a>(finetunedModelId, { ...params }) -> Cohere.ListTrainingStepMetricsResponse</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```typescript
await client.finetuning.listTrainingStepMetrics("finetuned_model_id");
```

</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**finetunedModelId:** `string` — The parent fine-tuned model ID.

</dd>
</dl>

<dl>
<dd>

**request:** `Cohere.FinetuningListTrainingStepMetricsRequest`

</dd>
</dl>

<dl>
<dd>

**requestOptions:** `Finetuning.RequestOptions`

</dd>
</dl>
</dd>
</dl>

</dd>
</dl>
</details>
