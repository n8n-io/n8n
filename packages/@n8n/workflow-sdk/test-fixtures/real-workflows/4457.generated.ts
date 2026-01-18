return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, position: [-140, 460], name: 'Listener' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.telegram', version: 1, config: { parameters: {
      text: '🤖 *Help Menu*\n\nUse `/summary <link>` to summarize an article.\nUse `/img <prompt>` to generate an image.\n\n_Example:_\n/summary https://example.com\n/img a futuristic cityscape',
      chatId: '={{$json["message"]["chat"]["id"]}}',
      additionalFields: { parse_mode: 'Markdown' }
    }, position: [380, 220], name: 'Help Responder' } }), node({ type: 'n8n-nodes-base.if', version: 1, config: { parameters: {
      conditions: {
        string: [
          {
            value1: '={{$json["message"]["text"]}}',
            value2: '/summary',
            operation: 'startsWith'
          }
        ]
      }
    }, position: [400, 540], name: 'Summary Checker' } })], { version: 1, parameters: {
      conditions: {
        string: [
          {
            value1: '={{$json["message"]["text"]}}',
            value2: '/help',
            operation: 'startsWith'
          }
        ]
      }
    }, name: 'Command Router' }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '={{ $json.message.link_preview_options.url }}',
      options: {},
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'User-Agent', value: 'Mozilla/5.0' }] }
    }, position: [760, 420], name: 'Fetcher' } }))
  .then(node({ type: 'n8n-nodes-base.html', version: 1.2, config: { parameters: {
      options: {},
      operation: 'extractHtmlContent',
      extractionValues: {
        values: [
          { key: 'text', cssSelector: 'body', skipSelectors: 'svg, a' }
        ]
      }
    }, position: [1160, 700], name: 'Text Extractor' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: { __rl: true, mode: 'list', value: '' },
      options: {},
      messages: {
        values: [
          {
            content: '=Summarize the entire content provided below into 10–12 concise bullet points. Ensure each point captures a unique and important aspect of the information, covering the core ideas, key facts, major findings, and essential takeaways. Avoid repetition and use clear, professional language suitable for quick understanding by a decision-maker.\n\nContent:\n {{ $json.text }}'
          }
        ]
      }
    }, position: [1520, 440], name: 'Summarizer' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1, config: { parameters: {
      text: '={{$json["candidates"][0]["content"]["parts"][0]["text"]}}',
      chatId: '={{ $(\'Listener\').item.json.message.chat.id }}',
      additionalFields: {}
    }, position: [2060, 440], name: 'Summary Sender' } }))
  .add(node({ type: 'n8n-nodes-base.if', version: 1, config: { parameters: {
      conditions: {
        string: [
          {
            value1: '={{$json["message"]["text"]}}',
            value2: '/img',
            operation: 'startsWith'
          }
        ]
      }
    }, position: [800, 1020], name: 'Image Prompt Checker' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: { options: {}, resource: 'image' }, position: [1400, 1160], name: 'Image Generator' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1, config: { parameters: {
      text: '🖼️ Generated image prompt submitted! Gemini image model doesn\'t return images directly. Use image generation APIs like Stability for actual image URLs.',
      chatId: '={{$json["message"]["chat"]["id"]}}',
      additionalFields: {}
    }, position: [2000, 820], name: 'Image Acknowledger' } }))
  .add(sticky('Quick-Start Telegram Echo Bot\n\nA single-node Telegram bot that parses /help, /summary <URL>, or /img <prompt> and returns either a help menu, a 10–12-point article summary, or an “image in progress” acknowledgement.', { color: 7, position: [-580, 60], width: 400 }))
  .add(sticky('Listener\n\nWatches for any new message from Telegram and kicks the flow off.', { name: 'Sticky Note1', color: 7, position: [-440, 420] }))
  .add(sticky('Command Router\n\nChecks if the message starts with /help, /summary, or /img, and sends it down the right path.', { name: 'Sticky Note2', color: 7, position: [-80, 780] }))
  .add(sticky('Help Responder\n\nWhen it sees /help, replies with a simple list of commands and how to use them.', { name: 'Sticky Note3', color: 7, position: [440, 20] }))
  .add(sticky('Summary Checker\n\nSees if the text begins with /summary. If yes, it moves on to fetch the article; if no, skips onward.', { name: 'Sticky Note4', color: 7, position: [340, 740] }))
  .add(sticky('Fetcher\n\nGoes to the provided URL and downloads the page’s HTML.\n', { name: 'Sticky Note5', color: 7, position: [740, 220] }))
  .add(sticky('Image Prompt Checker\n\nSees if the text begins with /img. If yes, forwards the prompt to the image generator; if not, ends the flow.', { name: 'Sticky Note6', color: 7, position: [780, 1180] }))
  .add(sticky('Text Extractor\n\nPulls out just the main article text (e.g. everything inside <body>).', { name: 'Sticky Note7', color: 7, position: [1100, 440] }))
  .add(sticky('Image Generator\n\nSends your prompt to OpenAI’s image endpoint (or your chosen image API).', { name: 'Sticky Note8', color: 7, position: [1320, 1360] }))
  .add(sticky('Summarizer\n\nSends the raw article text to OpenAI and asks for a 10–12-point professional bullet-point summary.', { name: 'Sticky Note9', color: 7, position: [1520, 220] }))
  .add(sticky('Image Acknowledger\n\nTells the user “Got it—your image is being made!” (and later you can hook this up to send the actual picture URL).', { name: 'Sticky Note10', color: 7, position: [1940, 1020] }))
  .add(sticky('Summary Sender\n\nDelivers the bullet-point summary back to the user in Telegram.\n', { name: 'Sticky Note11', color: 7, position: [2140, 220] }))
  .add(sticky('=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n', { name: 'Sticky Note12', color: 4, position: [-1260, 220], width: 480, height: 740 }))