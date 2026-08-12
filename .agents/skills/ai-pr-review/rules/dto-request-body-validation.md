# Use DTOs for Request Body Validation

- Rule Statement:
Controller endpoints that accept request bodies must use the `@Body`
decorator with a DTO class for runtime validation. TypeScript types alone
provide no runtime validation - only `@Body` with a Zod-based DTO
(extending `Z.class`) validates incoming data.

- Detection Criteria:
Only flag in `*.controller.ts` files when there is positive evidence the
developer intended to accept a body but didn't use the pattern:

  1. Parameter named `payload`, `body`, or `data` without `@Body` decorator
  2. Direct `req.body` access in a controller method
  3. `@Body` decorator with a type not ending in `Dto` (indicates
     unawareness of the DTO pattern)

- Do NOT flag:
  - `@Body` with a type ending in `Dto` (developer knows the pattern)
  - POST/PUT/PATCH endpoints without body parameters (may legitimately have no body)
  - Webhook controllers
  - Existing unchanged code (review only new or modified lines)

- Example Violation:
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

- Example Allowed:
  ```typescript
  @Post('/')
  async create(@Body payload: CreateUserDto) { ... }

  @Post('/activate')
  async activate(req: AuthenticatedRequest) {
    // Legitimately no body needed
  }
  ```

- Recommendation:
Use `@Body` decorator with a DTO class from `@n8n/api-types` or a local
`dto/` directory. DTOs must extend `Z.class` from `zod-class` for runtime
validation.
