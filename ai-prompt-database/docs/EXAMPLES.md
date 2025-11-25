# Exemplos de Uso

## Exemplos CLI

### 1. Criar um prompt de chatbot

```bash
npm run cli -- create

# O CLI irá interativamente pedir:
# - Nome: Chatbot de Suporte Técnico
# - Descrição: Assistente para dúvidas técnicas
# - Conteúdo: (abre editor) "Você é um assistente técnico..."
# - Categoria: Chatbots
# - Tags: suporte, técnico, atendimento
# - Modelo: gpt-4
# - Autor: equipe-dev
# - Compartilhar: Sim
```

### 2. Listar todos os prompts

```bash
npm run cli -- list

# Saída:
# 📚 Total de prompts: 3
#
# Chatbot de Suporte Técnico
#   ID: abc-123
#   Categoria: Chatbots
#   Tags: suporte, técnico, atendimento
#   Modelo: gpt-4
#   Atualizado: 01/01/2025 10:30:00
```

### 3. Buscar prompts

```bash
npm run cli -- search "chatbot"

# Saída:
# 🔍 Encontrados 2 prompts
#
# Chatbot de Suporte Técnico
#   ID: abc-123
#   Categoria: Chatbots
#   Descrição: Assistente para dúvidas técnicas...
```

### 4. Ver detalhes de um prompt

```bash
npm run cli -- show abc-123

# Saída:
# 📄 Detalhes do Prompt
#
# Nome: Chatbot de Suporte Técnico
# ID: abc-123
# Descrição: Assistente para dúvidas técnicas
# Categoria: Chatbots
# Tags: suporte, técnico, atendimento
# Modelo de IA: gpt-4
# Autor: equipe-dev
# Versão: 1
# Compartilhado: Sim
# Criado: 01/01/2025 10:00:00
# Atualizado: 01/01/2025 10:30:00
#
# Conteúdo:
# Você é um assistente técnico especializado...
```

### 5. Atualizar um prompt

```bash
npm run cli -- update abc-123

# O CLI pedirá os campos a atualizar
# (deixe em branco para manter o valor atual)
```

### 6. Exportar um prompt

```bash
npm run cli -- export abc-123 meu-prompt.json

# ✅ Prompt exportado para meu-prompt.json
```

### 7. Importar prompts

```bash
npm run cli -- import prompts-compartilhados.json

# ✅ 5 prompts importados com sucesso!
```

### 8. Ver categorias

```bash
npm run cli -- categories

# Saída:
# 📁 Categorias
#
#   Chatbots (5 prompts)
#   Documentação (3 prompts)
#   Marketing (2 prompts)
```

### 9. Ver tags

```bash
npm run cli -- tags

# Saída:
# 🏷️  Tags
#
#   atendimento (3 prompts)
#   marketing (2 prompts)
#   suporte (5 prompts)
```

### 10. Ver versões de um prompt

```bash
npm run cli -- versions abc-123

# Saída:
# 📜 Versões do Prompt (3)
#
# Versão 3
#   Alterado em: 01/01/2025 12:00:00
#   Alterado por: admin
#   Descrição: Atualização do prompt
#
# Versão 2
#   Alterado em: 01/01/2025 11:00:00
#   Alterado por: dev
#   Descrição: Atualização do prompt
```

## Exemplos API (JavaScript/TypeScript)

### 1. Criar um prompt

```typescript
const response = await fetch('http://localhost:3000/api/prompts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Gerador de Emails Marketing',
    description: 'Cria emails persuasivos para campanhas',
    content: 'Crie um email de marketing para...',
    category: 'Marketing',
    tags: ['email', 'marketing', 'vendas'],
    aiModel: 'gpt-4',
    author: 'marketing-team',
    shared: true,
  }),
});

const data = await response.json();
console.log('Prompt criado:', data.data.id);
```

### 2. Buscar prompts por categoria

```typescript
const response = await fetch('http://localhost:3000/api/prompts/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    category: 'Marketing',
    tags: ['email'],
  }),
});

const data = await response.json();
console.log(`Encontrados ${data.data.total} prompts`);
data.data.items.forEach(prompt => {
  console.log(`- ${prompt.name}`);
});
```

### 3. Busca rápida

```typescript
const query = 'chatbot';
const response = await fetch(
  `http://localhost:3000/api/prompts/search/quick?q=${encodeURIComponent(query)}`
);

const data = await response.json();
console.log(`Encontrados ${data.data.length} prompts`);
```

### 4. Atualizar um prompt

```typescript
const promptId = 'abc-123';
const response = await fetch(`http://localhost:3000/api/prompts/${promptId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Novo Nome do Prompt',
    tags: ['nova-tag', 'atualizado'],
    updatedBy: 'usuario-123',
  }),
});

const data = await response.json();
console.log('Prompt atualizado, nova versão:', data.data.version);
```

### 5. Listar prompts similares

```typescript
const promptId = 'abc-123';
const response = await fetch(
  `http://localhost:3000/api/prompts/${promptId}/similar?limit=5`
);

const data = await response.json();
console.log('Prompts similares:');
data.data.forEach(prompt => {
  console.log(`- ${prompt.name} (${prompt.category})`);
});
```

### 6. Compartilhar um prompt

```typescript
const promptId = 'abc-123';
const response = await fetch(`http://localhost:3000/api/prompts/${promptId}/share`, {
  method: 'POST',
});

const data = await response.json();
console.log('Prompt compartilhado:', data.data.shared);
```

### 7. Listar prompts compartilhados

```typescript
const response = await fetch('http://localhost:3000/api/shared');
const data = await response.json();

console.log(`${data.data.length} prompts compartilhados disponíveis`);
```

### 8. Obter estatísticas de categorias

```typescript
const response = await fetch('http://localhost:3000/api/categories/stats');
const data = await response.json();

console.log('Prompts por categoria:');
Object.entries(data.data).forEach(([category, count]) => {
  console.log(`${category}: ${count} prompts`);
});
```

### 9. Ver histórico de versões

```typescript
const promptId = 'abc-123';
const response = await fetch(`http://localhost:3000/api/prompts/${promptId}/versions`);
const data = await response.json();

console.log(`Histórico de ${data.data.length} versões:`);
data.data.forEach(version => {
  console.log(`Versão ${version.version} - ${version.changedAt} por ${version.changedBy}`);
});
```

### 10. Restaurar versão anterior

```typescript
const promptId = 'abc-123';
const versionNumber = 2;

const response = await fetch(
  `http://localhost:3000/api/prompts/${promptId}/restore/${versionNumber}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restoredBy: 'admin',
    }),
  }
);

const data = await response.json();
console.log('Versão restaurada. Nova versão:', data.data.version);
```

## Uso como Biblioteca TypeScript

Você também pode usar diretamente as classes do projeto:

```typescript
import { PromptService, SearchService } from 'ai-prompt-database';

const promptService = new PromptService();
const searchService = new SearchService();

// Criar prompt
const prompt = await promptService.createPrompt({
  name: 'Meu Prompt',
  description: 'Descrição',
  content: 'Conteúdo do prompt',
  category: 'Categoria',
  aiModel: 'gpt-4',
});

// Buscar prompts
const results = await searchService.searchPrompts({
  category: 'Categoria',
  tags: ['tag1'],
});

console.log(`Encontrados ${results.total} prompts`);
```

## Workflow Completo

### Exemplo: Criar e gerenciar prompts para um projeto

```bash
# 1. Criar categoria de prompts para o projeto
npm run cli -- create
# Nome: Setup de Projeto Node.js
# Categoria: DevOps
# Tags: nodejs, setup, automation

# 2. Criar mais prompts relacionados
npm run cli -- create
# Nome: Deploy com Docker
# Categoria: DevOps
# Tags: docker, deployment, automation

# 3. Listar prompts da categoria
curl http://localhost:3000/api/categories/DevOps/prompts

# 4. Exportar todos para backup
curl http://localhost:3000/api/prompts > backup.json

# 5. Buscar prompts similares
curl http://localhost:3000/api/prompts/{id}/similar

# 6. Compartilhar os melhores prompts
curl -X POST http://localhost:3000/api/prompts/{id}/share

# 7. Ver estatísticas
curl http://localhost:3000/api/categories/stats
curl http://localhost:3000/api/tags/stats
```
