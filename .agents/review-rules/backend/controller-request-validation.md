# Controller request bodies must use a DTO

Applies to: `*.controller.ts` outside `packages/cli/src/public-api` (the public
API has its own lint rules).

Controller endpoints that accept a request body must use the `@Body` decorator
with a DTO class. TypeScript types alone provide no runtime validation — only
`@Body` with a Zod-based DTO (extending `Z.class`) validates incoming data.

This fails quietly rather than loudly: `controller.registry.ts` validates only
when the parameter type exposes `safeParse`, and otherwise pushes nothing into
the handler's arguments at all.

Only flag when there is positive evidence the developer intended to accept a
body but didn't use the pattern:

1. A parameter named `payload`, `body`, or `data` without `@Body`
2. Direct `req.body` access in a controller method
3. `@Body` with a type not ending in `Dto` — suggests unawareness of the pattern

Do NOT flag:

- `@Body` with a type ending in `Dto` — the developer knows the pattern
- POST/PUT/PATCH endpoints with no body parameter; they may legitimately have no body
- Webhook controllers

Violation:

```typescript
@Post('/')
async create(req: AuthenticatedRequest, payload: CreateUser) {
  // payload is undefined - missing @Body decorator
}

@Post('/')
async create(req: AuthenticatedRequest) {
  const data = req.body; // No runtime validation
}

@Post('/')
async create(@Body payload: CreateUser) {
  // Type doesn't end in Dto - likely missing Zod validation
}
```

Allowed:

```typescript
@Post('/')
async create(@Body payload: CreateUserDto) { ... }

@Post('/activate')
async activate(req: AuthenticatedRequest) {
  // Legitimately no body needed
}
```

Use a DTO from `@n8n/api-types` or a local `dto/` directory. DTOs must extend
`Z.class` from `zod-class` for runtime validation.
