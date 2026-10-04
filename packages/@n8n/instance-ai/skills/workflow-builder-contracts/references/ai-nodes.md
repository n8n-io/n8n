# AI Nodes

A derived AI node takes provider modules in `providers`:

```ts
agent.execute({ name: 'Agent', promptType: 'define', text: (item) => item.question,
  providers: { model: lmChatOpenAi.execute({ name: 'Model', model: { mode: 'id', value: 'gpt-5-mini' } }) } })
```

A typed action is also an agent tool: put `<action>Tool` in `tools`. The model
fills each `fromModel()` field:
`httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })`.

To choose or replace a model, load the `model-selection` skill.
