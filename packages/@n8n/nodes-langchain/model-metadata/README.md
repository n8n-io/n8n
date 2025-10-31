# Model Metadata Files

This directory contains metadata for AI models used in n8n's LangChain nodes. The metadata is displayed in the "Browse Models" mode, providing users with detailed information about each model's capabilities, pricing, and recommended use cases.

## Directory Structure

```
model-metadata/
├── README.md
├── openai/          # OpenAI and OpenAI-compatible models
│   ├── gpt-4o.json
│   ├── gpt-4o-mini.json
│   ├── o1.json
│   └── ...
├── anthropic/       # Anthropic Claude models
│   ├── claude-3-5-sonnet-20241022.json
│   ├── claude-3-opus-20240229.json
│   └── ...
└── google/          # Google Gemini models (future)
    └── ...
```

## JSON Schema

Each model metadata file must follow this structure:

```json
{
  "id": "model-identifier",
  "name": "Display Name",
  "provider": "Provider Name",
  "pricing": {
    "promptPerMilTokenUsd": 2.5,
    "completionPerMilTokenUsd": 10.0
  },
  "contextLength": 128000,
  "maxOutputTokens": 16384,
  "capabilities": {
    "functionCalling": true,
    "structuredOutput": true,
    "vision": false,
    "imageGeneration": false,
    "audio": false,
    "extendedThinking": false
  },
  "inputModalities": ["text", "image"],
  "outputModalities": ["text"],
  "intelligenceLevel": "high",
  "recommendedFor": ["complex-reasoning", "coding", "analysis"],
  "description": "Brief description of the model...",
  "trainingCutoff": "2023-10",
  "notes": "Additional notes or limitations..."
}
```

## Field Definitions

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | string | ✅ | Model identifier (must match API) | `"gpt-4o"`, `"claude-3-5-sonnet-20241022"` |
| `name` | string | ✅ | Human-readable display name | `"GPT-4o"`, `"Claude 3.5 Sonnet"` |
| `provider` | string | ✅ | Provider/company name | `"OpenAI"`, `"Anthropic"`, `"Google"` |
| `pricing.promptPerMilTokenUsd` | number | ✅ | Input price per 1M tokens (USD) | `2.5`, `0.15` |
| `pricing.completionPerMilTokenUsd` | number | ✅ | Output price per 1M tokens (USD) | `10.0`, `0.6` |
| `contextLength` | number | ✅ | Maximum context window in tokens | `128000`, `200000` |
| `maxOutputTokens` | number | ❌ | Maximum output tokens | `16384`, `4096` |
| `capabilities.functionCalling` | boolean | ✅ | Supports tool/function calling | `true`, `false` |
| `capabilities.structuredOutput` | boolean | ✅ | Supports JSON schema output | `true`, `false` |
| `capabilities.vision` | boolean | ✅ | Accepts image inputs | `true`, `false` |
| `capabilities.imageGeneration` | boolean | ✅ | Can generate images | `true`, `false` |
| `capabilities.audio` | boolean | ✅ | Accepts audio inputs | `true`, `false` |
| `capabilities.extendedThinking` | boolean | ✅ | Extended reasoning (o1-style) | `true`, `false` |
| `inputModalities` | string[] | ❌ | Accepted input types | `["text", "image", "audio"]` |
| `outputModalities` | string[] | ❌ | Generated output types | `["text"]`, `["text", "image"]` |
| `intelligenceLevel` | enum | ✅ | Simple capability hint | `"low"`, `"medium"`, `"high"` |
| `recommendedFor` | string[] | ❌ | Use case recommendations | See section below |
| `description` | string | ❌ | Brief model description | Full text (1-2 sentences) |
| `trainingCutoff` | string | ❌ | Knowledge cutoff date | `"2023-10"`, `"2024-04"` (YYYY-MM format) |
| `notes` | string | ❌ | Additional notes/limitations | Full text |

## Intelligence Levels

Use these standardized values for `intelligenceLevel`:

- **`"low"`** - Basic models, older generations, fast inference
  - Examples: GPT-3.5 Turbo, older Claude 2 models
  - Use when: Speed and cost are more important than capability

- **`"medium"`** - Capable models, good for most tasks
  - Examples: GPT-4o Mini, Claude 3 Haiku, Claude 3.5 Haiku
  - Use when: Balanced performance and cost for everyday tasks

- **`"high"`** - Advanced models, best reasoning and complex tasks
  - Examples: GPT-4o, Claude 3.5 Sonnet, Claude 3 Opus, o1
  - Use when: Maximum accuracy and capability required

## Recommended Use Cases

Use these standardized values for `recommendedFor` (array):

- `"coding"` - Code generation, debugging, and refactoring
- `"analysis"` - Data analysis, interpretation, and insights
- `"creative-writing"` - Content creation, storytelling, copywriting
- `"complex-reasoning"` - Multi-step problem solving, strategic thinking
- `"conversation"` - Chat, dialogue, customer service
- `"summarization"` - Text summarization and condensation
- `"translation"` - Language translation
- `"multimodal"` - Image/audio understanding and processing
- `"function-calling"` - Tool use, API integration, workflow automation
- `"structured-output"` - JSON generation, schema-based responses

## Training Cutoff Format

Use `"YYYY-MM"` format for `trainingCutoff`:
- `"2023-10"` - October 2023
- `"2024-04"` - April 2024
- `"2024-12"` - December 2024

## Adding New Models

### 1. Create the JSON file

```bash
# For OpenAI models
touch model-metadata/openai/your-model-id.json

# For Anthropic models
touch model-metadata/anthropic/your-model-id.json
```

### 2. Fill in the metadata

Copy the schema from above and fill in all required fields. You can copy an existing file as a template:

```bash
cp model-metadata/openai/gpt-4o.json model-metadata/openai/new-model.json
```

### 3. Validate the metadata

```bash
cd packages/@n8n/nodes-langchain
pnpm validate-metadata
```

This will check for:
- All required fields present
- Valid `intelligenceLevel` enum value
- Positive pricing values
- Valid JSON syntax
- ID matches filename

### 4. Build the package

```bash
pnpm build
```

The metadata files will be copied to `dist/model-metadata/` automatically.

### 5. Test in the UI

1. Start n8n in development mode
2. Open an OpenAI Chat Model or Anthropic Chat Model node
3. Select "Browse Models" mode
4. Search for your model
5. Verify the metadata displays correctly

## Per-Node Overrides

Individual nodes can override global metadata by creating a `__model_metadata__/` directory in their node folder:

```
packages/@n8n/nodes-langchain/nodes/llms/YourNode/
├── YourNode.node.ts
└── __model_metadata__/
    └── custom-model.json
```

**Priority**: Per-node overrides take precedence over global metadata.

**Use case**: Custom fine-tuned models or node-specific model configurations.

## Development Workflow

### During Development

When you use a model that doesn't have a metadata file, the system:
1. Falls back to hardcoded metadata in `utils/modelMetadataMapper.ts`
2. Displays a console warning (development only):
   ```
   [DEV] Using fallback metadata for OpenAI model: gpt-5
   Consider adding metadata file: model-metadata/openai/gpt-5.json
   ```

This helps identify missing metadata files during development.

### Validation on Build

The `validate-metadata` script runs automatically during:
- `pnpm build` (via `copy-model-metadata`)
- `pnpm test` (via `pretest` hook)

Validation errors will fail the build and must be fixed before proceeding.

## Architecture

### Loading Flow

```
1. Build Time
   └─> validate-metadata checks all JSON files
   └─> copy-model-metadata copies to dist/

2. Runtime (Backend)
   └─> LoadNodesAndCredentials.resolveModelMetadata()
       ├─ Checks per-node __model_metadata__/ (if nodeType provided)
       └─ Checks global model-metadata/{provider}/ directory
   └─> Express endpoint: GET /model-metadata/:provider/:modelId.json
       └─ Serves file with caching headers

3. Frontend
   └─> ModelBrowser component loads models
   └─> Calls modelMetadataStore.getModelMetadata() for each model
   └─> Fetches from API: /model-metadata/openai/gpt-4o.json
   └─> Caches in Pinia store
   └─> Enriches model data with file metadata (preferred) or fallback
```

### Security

- Path validation via `isContainedWithin()` prevents directory traversal
- Metadata files must be within package or node directory
- Same security model as schema files (`__schema__/`)

## Maintenance

### Updating Model Prices

When model prices change:

1. Update the JSON file: `model-metadata/{provider}/{model-id}.json`
2. Commit the change
3. Rebuild: `pnpm build`

### Adding New Providers

To add a new provider (e.g., Google):

1. Create directory: `mkdir model-metadata/google`
2. Add model files: `touch model-metadata/google/gemini-pro.json`
3. Update validation script if needed (usually not required)
4. Build and test

### Deprecating Models

For deprecated models:
- Keep the metadata file but add a note:
  ```json
  {
    "notes": "DEPRECATED: This model is no longer recommended. Use gpt-4o instead."
  }
  ```
- Consider adding a `deprecated: true` field (future enhancement)

## Testing

### Manual Testing

```bash
# Validate all metadata
pnpm validate-metadata

# Build and copy
pnpm build

# Test specific model API endpoint (when n8n is running)
curl http://localhost:5678/model-metadata/openai/gpt-4o.json
```

### Unit Tests

Model metadata loading is tested as part of:
- Node integration tests
- Frontend component tests
- API endpoint tests

## Contributing

When adding new model metadata:

1. Use the exact model ID from the provider's API
2. Fill all required fields
3. Use standardized `recommendedFor` values
4. Keep descriptions concise (1-2 sentences)
5. Validate before committing
6. Test in the UI browse mode

## Future Enhancements

Potential future additions to the schema:
- `deprecated: boolean` - Mark deprecated models
- `speed: string` - Performance tier (fast, medium, slow)
- `releaseDate: string` - When the model was released
- `capabilities.streaming: boolean` - Supports streaming responses
- `capabilities.caching: boolean` - Supports context caching

These can be added without breaking existing metadata files.
