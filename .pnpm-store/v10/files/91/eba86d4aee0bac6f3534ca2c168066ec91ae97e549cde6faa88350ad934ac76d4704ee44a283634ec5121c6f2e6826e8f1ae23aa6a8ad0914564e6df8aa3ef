# microsoft/agents-hosting

## Overview

The `@microsoft/agents-hosting` package provides the necessary tools and components to create and host Microsoft Agents. This package includes a compatible API to migrate a bot using `botbuilder` from the BotFramework SDK.

## Installation

To install the package:

```sh
npm install @microsoft/agents-hosting
```

## Example Usage based on the AgentApplication object

```ts
import { AgentApplication, MemoryStorage, TurnContext, TurnState } from '@microsoft/agents-hosting'

const echo = new AgentApplication<TurnState>({ storage: new MemoryStorage() })
echo.onConversationUpdate('membersAdded', async (context: TurnContext) => {
  await context.sendActivity('Welcome to the Echo sample, send a message to see the echo feature in action.')
})
echo.onActivity('message', async (context: TurnContext, state: TurnState) => {
  let counter: number = state.getValue('conversation.counter') || 0
  await context.sendActivity(`[${counter++}]You said: ${context.activity.text}`)
  state.setValue('conversation.counter', counter)
})
```

## Example Usage based on bot framework Activity Handler

Create an Echo bot using the ActivityHandler

```ts
// myHandler.ts
import { ActivityHandler, MessageFactory } from '@microsoft/agents-hosting'

export class MyHandler extends ActivityHandler {
  constructor () {
    super()
    this.onMessage(async (context, next) => {
      const replyText = `Agent: ${context.activity.text}`
      await context.sendActivity(MessageFactory.text(replyText))
      await next()
    })
  }
}
```

Host the bot with express

```ts
// index.ts
import express, { Response } from 'express'
import { Request, CloudAdapter, authorizeJWT, AuthConfiguration, loadAuthConfigFromEnv } from '@microsoft/agents-hosting'
import { EchoBot } from './myHandler'

const authConfig: AuthConfiguration = loadAuthConfigFromEnv()

const adapter = new CloudAdapter(authConfig)
const myHandler = new MyHandler()

const app = express()

app.use(express.json())
app.use(authorizeJWT(authConfig))

app.post('/api/messages', async (req: Request, res: Response) => {
  await adapter.process(req, res, async (context) => await myHandler.run(context))
})

```
