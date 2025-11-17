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
├── google/          # Google Gemini models
│   ├── gemini-2.5-flash.json
│   ├── gemini-2.5-pro.json
│   ├── _aliases.json
│   └── ...
└── mistral/         # Mistral AI models
    ├── mistral-large-latest.json
    ├── mistral-small-latest.json
    ├── _aliases.json
    └── ...
```

## JSON Schema

Each model metadata file must follow this structure:

```json
{
  "id": "model-identifier",
  "name": "Display Name",
  "shortName": "Short",
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
  "intelligenceLevel": "high"
}
```

## Field Definitions

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `id` | string | ✅ | Model identifier (must match API) | `"gpt-4o"`, `"claude-3-5-sonnet-20241022"` |
| `name` | string | ✅ | Human-readable display name | `"GPT-4o"`, `"Claude 3.5 Sonnet"` |
| `shortName` | string | ❌ | Abbreviated name for compact display | `"GPT-4o"`, `"Claude 3.5S"` |
| `provider` | string | ✅ | Provider/company name | `"OpenAI"`, `"Anthropic"`, `"Google"` |
| `pricing.promptPerMilTokenUsd` | number | ✅ | Input price per 1M tokens (USD) | `2.5`, `0.15` |
| `pricing.completionPerMilTokenUsd` | number | ✅ | Output price per 1M tokens (USD) | `10.0`, `0.6` |
| `contextLength` | number | ✅ | Maximum context window in tokens | `128000`, `200000` |
| `maxOutputTokens` | number | ❌ | Maximum output tokens | `16384`, `4096` |
| `capabilities.functionCalling` | boolean | ❌ | Supports tool/function calling | `true`, `false` |
| `capabilities.structuredOutput` | boolean | ❌ | Supports JSON schema output | `true`, `false` |
| `capabilities.vision` | boolean | ❌ | Accepts image inputs | `true`, `false` |
| `capabilities.imageGeneration` | boolean | ❌ | Can generate images | `true`, `false` |
| `capabilities.audio` | boolean | ❌ | Accepts audio inputs | `true`, `false` |
| `capabilities.extendedThinking` | boolean | ❌ | Extended reasoning (o1-style) | `true`, `false` |
| `inputModalities` | string[] | ❌ | Accepted input types | `["text", "image", "audio"]` |
| `outputModalities` | string[] | ❌ | Generated output types | `["text"]`, `["text", "image"]` |
| `intelligenceLevel` | enum | ✅ | Capability level | `"low"`, `"medium"`, `"high"` |

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

1. Start n8n in development mode: `pnpm dev`
2. Add a Chat Model node (OpenAI, Anthropic, Google Gemini, or Mistral)
3. Click the model selector dropdown
4. Search for your model
5. Verify the metadata displays correctly (pricing, capabilities, context length)

## Development Workflow

### During Development

When you use a model that doesn't have a metadata file:
- The model will appear in the dropdown without metadata (name and value only)
- No metadata will be displayed in the UI (capabilities, pricing, etc.)
- To add metadata: Create a JSON file for the model following the schema above

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
   Node listSearch methods:
   └─> Call provider API to get available models
   └─> For each model, load metadata via loadModelMetadata()
       ├─ Check in-memory cache first
       ├─ Load from model-metadata/{provider}/{modelId}.json
       ├─ Support alias resolution via _aliases.json
       └─ Return undefined if not found
   └─> Return results with complete metadata to frontend

3. Frontend
   └─> Receives model list with metadata included
   └─> Displays metadata in ResourceLocator dropdown
   └─> No additional API calls needed
```

### Performance

- **In-memory cache**: Metadata cached after first load
- **Node.js caching**: File reads cached by Node.js
- **Load time**: ~1ms first load, <0.01ms cached
- **Memory footprint**: ~100KB for all 176 models
- **Network efficiency**: Single API call (no metadata waterfall)

### Alias Resolution

The `_aliases.json` file maps model aliases to canonical IDs:

```json
{
  "chatgpt-4o-latest": "gpt-4o",
  "gpt-4-turbo-preview": "gpt-4-turbo"
}
```

This allows users to use common aliases while maintaining a single metadata file.

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

## Testing

### Manual Testing

```bash
# Validate all metadata
pnpm validate-metadata

# Build and copy
pnpm build

# Test in development
pnpm dev
# Open a model node in the UI and verify metadata displays in the dropdown
```

### Unit Tests

Model metadata loading is tested as part of:
- Node integration tests
- listSearch method tests

## Contributing

When adding new model metadata:

1. Use the exact model ID from the provider's API
2. Fill all required fields (id, name, provider, pricing, contextLength, intelligenceLevel, capabilities)
3. Validate before committing: `pnpm validate-metadata`
4. Test in the UI model selection dropdown
