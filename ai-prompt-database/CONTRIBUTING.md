# Guia de Contribuição

Obrigado por considerar contribuir com o AI Prompt Database!

## Como Contribuir

### 1. Setup do Ambiente

```bash
# Clone o repositório
git clone <url-do-repo>
cd ai-prompt-database

# Instale as dependências
npm install

# Copie o arquivo de ambiente
cp .env.example .env
```

### 2. Desenvolvimento

```bash
# Modo desenvolvimento (watch mode)
npm run dev

# Rodar API em desenvolvimento
npm run api

# Rodar CLI
npm run cli -- <comando>

# Executar testes
npm test

# Verificar tipos
npm run typecheck

# Lint
npm run lint
```

### 3. Estrutura do Projeto

```
ai-prompt-database/
├── src/
│   ├── models/        # Interfaces e tipos TypeScript
│   ├── storage/       # Sistema de armazenamento em arquivos
│   ├── services/      # Lógica de negócio
│   ├── api/           # API REST (Express)
│   ├── cli/           # Interface CLI
│   └── utils/         # Funções auxiliares
├── data/              # Armazenamento local
├── tests/             # Testes
└── docs/              # Documentação
```

### 4. Guidelines de Código

#### TypeScript
- **NUNCA** use `any` - use tipos apropriados ou `unknown`
- Evite usar `as` para type casting
- Prefira interfaces a types quando possível
- Use async/await ao invés de Promises diretas

#### Nomenclatura
- Classes: PascalCase (ex: `PromptService`)
- Funções/métodos: camelCase (ex: `createPrompt`)
- Constantes: UPPER_SNAKE_CASE (ex: `MAX_RETRIES`)
- Arquivos: PascalCase para classes, camelCase para utilitários

#### Comentários
- Use JSDoc para documentar funções públicas
- Comente apenas lógica complexa
- Prefira código auto-explicativo a comentários

### 5. Testes

- Escreva testes para toda nova funcionalidade
- Mantenha cobertura de código acima de 80%
- Use mocks para dependências externas
- Execute `npm test` antes de commitar

```typescript
// Exemplo de teste
describe('PromptService', () => {
  it('deve criar um novo prompt', async () => {
    const service = new PromptService();
    const prompt = await service.createPrompt({
      name: 'Test',
      content: 'Test content',
      category: 'Test',
      aiModel: 'gpt-4',
    });

    expect(prompt.id).toBeDefined();
    expect(prompt.name).toBe('Test');
  });
});
```

### 6. Commits

Use mensagens de commit descritivas:

```bash
# Formato: tipo(escopo): descrição

feat(api): adicionar endpoint de estatísticas
fix(cli): corrigir erro ao deletar prompt
docs(readme): atualizar exemplos de uso
test(service): adicionar testes para SearchService
refactor(storage): simplificar lógica de leitura
```

Tipos de commit:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `test`: Testes
- `refactor`: Refatoração
- `style`: Formatação
- `chore`: Tarefas de manutenção

### 7. Pull Requests

1. Crie uma branch para sua feature:
   ```bash
   git checkout -b feat/minha-feature
   ```

2. Faça suas alterações e commits

3. Execute todos os checks:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```

4. Push e crie o PR:
   ```bash
   git push origin feat/minha-feature
   ```

5. Descreva suas alterações no PR:
   - O que foi alterado?
   - Por que foi alterado?
   - Como testar?

### 8. Adicionando Nova Funcionalidade

#### Exemplo: Adicionar novo tipo de busca

1. **Adicionar interface no modelo** (`src/models/Prompt.ts`):
```typescript
export interface AdvancedSearchOptions {
  // seus novos campos
}
```

2. **Implementar no serviço** (`src/services/SearchService.ts`):
```typescript
async advancedSearch(options: AdvancedSearchOptions): Promise<Prompt[]> {
  // sua implementação
}
```

3. **Adicionar rota na API** (`src/api/routes.ts`):
```typescript
router.post('/prompts/advanced-search', asyncHandler(async (req, res) => {
  const result = await searchService.advancedSearch(req.body);
  res.json({ success: true, data: result });
}));
```

4. **Adicionar comando CLI** (`src/cli/commands.ts`):
```typescript
export async function advancedSearchCommand(options: AdvancedSearchOptions) {
  // sua implementação
}
```

5. **Escrever testes** (`tests/SearchService.test.ts`):
```typescript
describe('advancedSearch', () => {
  it('deve buscar com opções avançadas', async () => {
    // seu teste
  });
});
```

6. **Atualizar documentação** (`docs/API.md`, `docs/EXAMPLES.md`)

### 9. Reportar Bugs

Ao reportar bugs, inclua:
- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Versão do Node.js e sistema operacional
- Logs de erro (se aplicável)

### 10. Sugerir Funcionalidades

Ao sugerir novas funcionalidades:
- Descreva o problema que resolve
- Explique a solução proposta
- Considere alternativas
- Pense no impacto na API existente

## Perguntas?

Abra uma issue ou entre em contato!

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT.
