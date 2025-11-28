# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-01-25

### Adicionado

#### Core
- Sistema de armazenamento em arquivos JSON
- Modelos de dados TypeScript completos
- Sistema de gerenciamento de erros customizado

#### Funcionalidades
- ✅ CRUD completo de prompts (Create, Read, Update, Delete)
- 🏷️ Sistema de categorização e tags
- 🔍 Busca e filtros avançados
  - Busca por nome, categoria, tags, modelo de IA, autor
  - Busca no conteúdo
  - Busca de prompts similares
  - Prompts recentes e antigos
- 📝 Versionamento automático de prompts
  - Histórico completo de alterações
  - Restauração de versões anteriores
- 🔗 Sistema de compartilhamento
  - Export/import de prompts
  - Marcação de prompts compartilhados

#### API REST
- Servidor Express com endpoints completos
- Tratamento de erros padronizado
- Suporte a CORS
- Endpoints para:
  - CRUD de prompts
  - Busca e filtros
  - Categorias e tags
  - Versionamento
  - Compartilhamento

#### CLI
- Interface interativa com Commander.js
- Comandos disponíveis:
  - `create` - Criar novo prompt
  - `list` - Listar prompts
  - `show` - Ver detalhes
  - `search` - Buscar prompts
  - `update` - Atualizar prompt
  - `delete` - Deletar prompt
  - `export` - Exportar para JSON
  - `import` - Importar de JSON
  - `categories` - Listar categorias
  - `tags` - Listar tags
  - `versions` - Ver histórico
- Interface colorida com Chalk
- Prompts interativos com Inquirer

#### Documentação
- README completo com instruções de uso
- Documentação da API (API.md)
- Exemplos de uso (EXAMPLES.md)
- Guia de contribuição (CONTRIBUTING.md)

#### Testes
- Configuração do Jest para TypeScript
- Testes unitários para PromptService
- Cobertura de código

#### DevOps
- Configuração TypeScript
- ESLint para qualidade de código
- Scripts npm para desenvolvimento
- Estrutura de diretórios organizada

### Estrutura de Dados

```typescript
interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  parameters: PromptParameter[];
  aiModel: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  author: string;
  shared: boolean;
}
```

### Tecnologias Utilizadas

- **Runtime**: Node.js + TypeScript
- **API**: Express.js
- **CLI**: Commander.js + Inquirer + Chalk
- **Testes**: Jest
- **Linting**: ESLint
- **Armazenamento**: Sistema de arquivos (JSON)

## [Unreleased]

### Planejado para próximas versões

- [ ] Autenticação e autorização na API
- [ ] Interface web (frontend)
- [ ] Suporte a múltiplos usuários
- [ ] Integração com bancos de dados (PostgreSQL, MongoDB)
- [ ] Sincronização com serviços em nuvem
- [ ] Templates de prompts
- [ ] Validação de prompts com IA
- [ ] Análise de performance de prompts
- [ ] Sugestões de melhorias automáticas
- [ ] Integração com APIs de IA (OpenAI, Anthropic)
- [ ] Dashboard de estatísticas
- [ ] Sistema de permissões granulares
- [ ] API GraphQL como alternativa
- [ ] Webhooks para eventos
- [ ] Rate limiting na API

---

## Formato

### Tipos de mudanças

- `Adicionado` - Para novas funcionalidades
- `Modificado` - Para mudanças em funcionalidades existentes
- `Depreciado` - Para funcionalidades que serão removidas
- `Removido` - Para funcionalidades removidas
- `Corrigido` - Para correções de bugs
- `Segurança` - Para correções de vulnerabilidades
