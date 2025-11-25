# Documentação da API

API REST para gerenciar prompts de IA.

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Prompts

#### `GET /prompts`
Lista todos os prompts.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Nome do Prompt",
      "description": "Descrição",
      "content": "Conteúdo...",
      "category": "Categoria",
      "tags": ["tag1", "tag2"],
      "parameters": [],
      "aiModel": "gpt-4",
      "version": 1,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "author": "Autor",
      "shared": false
    }
  ]
}
```

#### `GET /prompts/:id`
Obtém detalhes de um prompt específico.

**Parâmetros:**
- `id` (URL): ID do prompt

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Nome do Prompt",
    ...
  }
}
```

#### `POST /prompts`
Cria um novo prompt.

**Body:**
```json
{
  "name": "Nome do Prompt",
  "description": "Descrição",
  "content": "Conteúdo do prompt",
  "category": "Categoria",
  "tags": ["tag1", "tag2"],
  "parameters": [
    {
      "name": "param1",
      "type": "string",
      "description": "Descrição",
      "required": true
    }
  ],
  "aiModel": "gpt-4",
  "author": "Autor",
  "shared": false
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-gerado",
    "name": "Nome do Prompt",
    ...
  }
}
```

#### `PUT /prompts/:id`
Atualiza um prompt existente.

**Parâmetros:**
- `id` (URL): ID do prompt

**Body:**
```json
{
  "name": "Novo Nome",
  "description": "Nova Descrição",
  "updatedBy": "usuario"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Novo Nome",
    "version": 2,
    ...
  }
}
```

#### `DELETE /prompts/:id`
Deleta um prompt.

**Parâmetros:**
- `id` (URL): ID do prompt

**Resposta:**
```json
{
  "success": true,
  "message": "Prompt deletado com sucesso"
}
```

### Versões

#### `GET /prompts/:id/versions`
Lista todas as versões de um prompt.

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "promptId": "uuid",
      "version": 1,
      "prompt": {...},
      "changedAt": "2025-01-01T00:00:00Z",
      "changedBy": "usuario",
      "changeDescription": "Criação inicial"
    }
  ]
}
```

#### `POST /prompts/:id/restore/:version`
Restaura uma versão específica de um prompt.

**Parâmetros:**
- `id` (URL): ID do prompt
- `version` (URL): Número da versão a restaurar

**Body:**
```json
{
  "restoredBy": "usuario"
}
```

### Busca

#### `POST /prompts/search`
Busca prompts com filtros avançados.

**Query Parameters:**
- `page` (opcional): Número da página (padrão: 1)
- `pageSize` (opcional): Tamanho da página (padrão: 10)

**Body:**
```json
{
  "name": "termo de busca",
  "category": "Categoria",
  "tags": ["tag1", "tag2"],
  "aiModel": "gpt-4",
  "author": "Autor",
  "shared": true,
  "contentSearch": "busca no conteúdo"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

#### `GET /prompts/search/quick?q=termo`
Busca rápida por texto.

**Query Parameters:**
- `q`: Termo de busca

**Resposta:**
```json
{
  "success": true,
  "data": [...]
}
```

#### `GET /prompts/:id/similar?limit=5`
Encontra prompts similares.

**Query Parameters:**
- `limit` (opcional): Número de resultados (padrão: 5)

#### `GET /prompts/search/recent?limit=10`
Lista prompts mais recentes.

**Query Parameters:**
- `limit` (opcional): Número de resultados (padrão: 10)

### Categorias

#### `GET /categories`
Lista todas as categorias.

**Resposta:**
```json
{
  "success": true,
  "data": ["Categoria1", "Categoria2", ...]
}
```

#### `GET /categories/stats`
Estatísticas de uso de categorias.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "Categoria1": 10,
    "Categoria2": 5,
    ...
  }
}
```

#### `GET /categories/:category/prompts`
Lista prompts de uma categoria.

### Tags

#### `GET /tags`
Lista todas as tags.

#### `GET /tags/stats`
Estatísticas de uso de tags.

#### `GET /tags/:tag/prompts`
Lista prompts com uma tag específica.

### Compartilhamento

#### `GET /shared`
Lista prompts compartilhados.

#### `POST /prompts/:id/share`
Marca um prompt como compartilhado.

#### `POST /prompts/:id/unshare`
Remove marca de compartilhado.

## Tratamento de Erros

Todos os erros retornam o formato:

```json
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "CODIGO_DO_ERRO"
}
```

### Códigos de Status HTTP

- `200`: Sucesso
- `201`: Criado com sucesso
- `400`: Erro de validação
- `404`: Recurso não encontrado
- `409`: Conflito/duplicação
- `500`: Erro interno do servidor

## Exemplos com cURL

### Criar um prompt

```bash
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chatbot Assistente",
    "description": "Prompt para chatbot de suporte",
    "content": "Você é um assistente prestativo...",
    "category": "Chatbots",
    "tags": ["suporte", "atendimento"],
    "aiModel": "gpt-4",
    "author": "dev"
  }'
```

### Buscar prompts

```bash
curl -X POST http://localhost:3000/api/prompts/search \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Chatbots",
    "tags": ["suporte"]
  }'
```

### Listar prompts

```bash
curl http://localhost:3000/api/prompts
```

### Obter detalhes de um prompt

```bash
curl http://localhost:3000/api/prompts/{id}
```

### Atualizar um prompt

```bash
curl -X PUT http://localhost:3000/api/prompts/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Nome",
    "updatedBy": "dev"
  }'
```

### Deletar um prompt

```bash
curl -X DELETE http://localhost:3000/api/prompts/{id}
```
