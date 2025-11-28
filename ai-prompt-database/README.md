# AI Prompt Database

Base de dados de prompts de IA com CLI e API REST.

## Características

- ✅ CRUD completo de prompts
- 🏷️ Sistema de categorização e tags
- 🔍 Busca e filtros avançados
- 📝 Versionamento de prompts
- 🔗 Compartilhamento de prompts (export/import)
- 🌐 API REST
- 💻 Interface CLI

## Instalação

```bash
npm install
npm run build
```

## Uso

### CLI

```bash
# Criar novo prompt
npm run cli -- create

# Listar prompts
npm run cli -- list

# Buscar prompts
npm run cli -- search "keyword"

# Ver detalhes de um prompt
npm run cli -- show <id>

# Atualizar prompt
npm run cli -- update <id>

# Deletar prompt
npm run cli -- delete <id>

# Exportar prompt
npm run cli -- export <id> <arquivo>

# Importar prompt
npm run cli -- import <arquivo>
```

### API REST

```bash
# Iniciar servidor
npm run api
```

#### Endpoints

- `GET /api/prompts` - Listar todos os prompts
- `GET /api/prompts/:id` - Obter prompt específico
- `POST /api/prompts` - Criar novo prompt
- `PUT /api/prompts/:id` - Atualizar prompt
- `DELETE /api/prompts/:id` - Deletar prompt
- `GET /api/prompts/search` - Buscar prompts
- `GET /api/prompts/:id/versions` - Listar versões de um prompt
- `POST /api/prompts/:id/export` - Exportar prompt
- `POST /api/prompts/import` - Importar prompt

## Estrutura de um Prompt

```json
{
  "id": "uuid",
  "name": "Nome do Prompt",
  "description": "Descrição detalhada",
  "content": "Conteúdo do prompt...",
  "category": "Categoria",
  "tags": ["tag1", "tag2"],
  "parameters": [
    {
      "name": "param1",
      "type": "string",
      "description": "Descrição do parâmetro",
      "required": true
    }
  ],
  "aiModel": "gpt-4",
  "version": 1,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "author": "Autor",
  "shared": false
}
```

## Desenvolvimento

```bash
# Modo desenvolvimento
npm run dev

# Testes
npm test

# Type checking
npm run typecheck

# Lint
npm run lint
```

## Licença

MIT
