# AI Assistant Service SDK

SDK provides provides a router that handle authentication between an n8n instance and the AI service, and proxy all requests from `/rest/ai` path to the AI service.

## Communication Flow

All requests between the n8n Back-end and AI service go thought the router the sdk provides.

```mermaid
sequenceDiagram
    participant U as User
    participant n as n8n Back-end
    participant A as AI Service

    U->>n: Ask help from Assistant
    n->>A: Authenticate<br/>POST /auth/token<br/><br/>{ licenseCert }
    A->>A: Parse & validate license
    A-->>n: Access token (JWT)
    n->>A: Ask question
    A-->>n: Answer
    n-->>U: Answer
```
