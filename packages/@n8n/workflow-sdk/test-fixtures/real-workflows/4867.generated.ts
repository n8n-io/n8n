return workflow('e5XxiuYXr5atCH64', 'Stock Analysis Assistant', {
    timezone: 'America/Los_Angeles',
    callerPolicy: 'workflowsFromSameOwner',
    executionOrder: 'v1'
  })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: {
        interval: [
          { field: 'cronExpression', expression: '0 30 6-14 * * 1-5' }
        ]
      }
    }, position: [120, 0] } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://paper-api.alpaca.markets/v2/clock',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth'
    }, credentials: {
      httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' }
    }, position: [360, 0], name: 'Check Market Status' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      mode: 'raw',
      options: {},
      jsonOutput: '{\n  "symbols": "AAPL,MSFT,NVDA,TSLA,AMZN,GOOGL,META,JPM,XOM,UNH,GME"\n}\n'
    }, position: [800, 0], name: 'Ticker List' } }), node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [800, 200], name: 'Market is Closed' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'acca2d72-d9db-436d-aee8-81a3a359fe85',
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            leftValue: '={{ $json.is_open }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'Check if Market is open' }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://data.alpaca.markets/v2/stocks/bars',
      options: {},
      sendQuery: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpCustomAuth',
      queryParameters: {
        parameters: [
          { name: 'symbols', value: '={{ $json.symbols }}' },
          { name: 'timeframe', value: '1Day' },
          { name: 'limit', value: '1000' },
          { name: 'feed', value: 'iex' },
          {
            name: '=start',
            value: '={{ new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split(\'T\')[0] }}'
          },
          {
            name: 'end',
            value: '={{ new Date().toISOString().split(\'T\')[0] }}'
          }
        ]
      }
    }, credentials: {
      httpCustomAuth: { id: 'credential-id', name: 'httpCustomAuth Credential' }
    }, position: [1020, 0], name: 'Fetch Stock Data' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      language: 'python',
      pythonCode: 'import pandas as pd\nimport numpy as np\nimport json\n\nbars_by_symbol = items[0][\'json\'][\'bars\']\nstocks = []\n\nfor symbol, bars in bars_by_symbol.items():\n    closes = [bar[\'c\'] for bar in bars if \'c\' in bar]\n    if len(closes) < 30:\n        continue\n\n    df = pd.DataFrame({\'close\': closes})\n\n    # RSI(14)\n    delta = df[\'close\'].diff()\n    gain = delta.clip(lower=0)\n    loss = -delta.clip(upper=0)\n    avg_gain = gain.rolling(14).mean()\n    avg_loss = loss.rolling(14).mean()\n    rs = avg_gain / avg_loss\n    df[\'rsi\'] = 100 - (100 / (1 + rs))\n\n    # MACD (12,26,9)\n    ema12 = df[\'close\'].ewm(span=12, adjust=False).mean()\n    ema26 = df[\'close\'].ewm(span=26, adjust=False).mean()\n    df[\'macd\'] = ema12 - ema26\n    df[\'signal\'] = df[\'macd\'].ewm(span=9, adjust=False).mean()\n\n    latest = df.iloc[-1]\n    rsi = latest[\'rsi\']\n    macd = latest[\'macd\']\n    signal = latest[\'signal\']\n\n    status = "Hold"\n    if rsi < 30 and macd > signal:\n        status = "Buy"\n    elif rsi > 70 and macd < signal:\n        status = "Sell"\n\n    stocks.append({\n        "ticker": symbol,\n        "rsi": round(float(rsi), 2),\n        "macd": round(float(macd), 2),\n        "signal": round(float(signal), 2),\n        "status": status\n    })\n\nreturn [{\n    "json": {\n        "summary": json.dumps({\n            "stocks": stocks\n        }, separators=(\',\', \':\')),\n      "stocks": stocks\n    }\n}]\n'
    }, position: [1240, 0], name: 'Interpret Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      text: '=Here is the technical indicator data as JSON:\n\n{{ $json.summary }}\n\nPulled as of {{ $now }}',
      prompt: 'define',
      options: {},
      resource: 'assistant',
      assistantId: {
        mode: 'list',
        value: 'REDACTED_ASSISTANT_ID',
        cachedResultName: 'REDACTED_ASSISTANT'
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1440, 0], name: 'Stock Analysis Assistant' } }))
  .then(node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { parameters: {
      text: '={{ $json.output }}',
      user: {
        mode: 'list',
        value: 'REDACTED_USER_ID',
        cachedResultName: 'REDACTED_USER'
      },
      select: 'user',
      otherOptions: {}
    }, credentials: {
      slackApi: { id: 'credential-id', name: 'slackApi Credential' }
    }, position: [1816, 0], name: 'Send Summary to User(s)' } }))
  .then(node({ type: 'n8n-nodes-base.noOp', version: 1, config: { position: [2040, 0], name: 'End of Flow' } }))
  .add(sticky('# 🧠 Stock Analysis Assistant\n\nThis workflow analyzes selected S&P 500 stocks using RSI and MACD indicators, summarizes the insights into plain English, and posts an update to Slack every hour during U.S. market hours (Mon–Fri).', { position: [-640, -360], width: 660 }))
  .add(sticky('## 📅 Schedule Trigger\n\n**Node:** `Schedule Trigger`  \nRuns every hour between 6:30 AM and 2:30 PM (PST), Monday to Friday.  \n**Cron Expression:** `0 30 6-14 * * 1-5`\n\n⏰ Triggers analysis only during U.S. stock market hours.', { name: 'Sticky Note1', color: 7, position: [40, -360], height: 700 }))
  .add(sticky('## 🏛️ Market Status Check\n\n**Node:** `Check Market Status`  \nEndpoint: `https://paper-api.alpaca.markets/v2/clock`\n\nChecks if the market is open using Alpaca’s `/clock` endpoint.\n\n**Node:** `Check if Market is open`  \n- ✅ If true → continue  \n- ❌ If false → exit gracefully via the “Market is Closed” NoOp node', { name: 'Sticky Note2', color: 7, position: [280, -360], width: 460, height: 700 }))
  .add(sticky('## 📈 Ticker Setup\n\n**Node:** `Ticker List`  \nSets the stock symbols to be analyzed.\n\n📌 You can update this list to monitor different stocks.', { name: 'Sticky Note3', color: 4, position: [740, -360], width: 220, height: 540 }))
  .add(sticky('## 🔗 Fetch Stock Data\n\n**Node:** `Fetch Stock Data`  \nCalls Alpaca’s `/v2/stocks/bars` endpoint with:\n- `symbols`: from `Ticker List`\n- `timeframe`: `1Day`\n- `limit`: `1000`\n- `feed`: `iex` (avoid SIP permission error)\n- `start`: 100 days ago\n- `end`: today', { name: 'Sticky Note4', color: 4, position: [960, -360], width: 220, height: 540 }))
  .add(sticky('## 🧮 Interpret Data\n\n**Node:** `Interpret Data`  \nPython code calculates:\n- RSI(14)\n- MACD(12,26,9)\n- Decision status: `"Buy"`, `"Hold"`, or `"Sell"`\n\nOutputs:\n- `stocks`: a list of indicator values and status\n- `summary`: JSON string version for GPT', { name: 'Sticky Note5', color: 4, position: [1180, -360], width: 220, height: 540 }))
  .add(sticky('## 🤖 AI Assistant Summary\n\n**Node:** `Stock Analysis Assistant`  \nUses a custom OpenAI assistant to:\n- Group stocks into categories\n- Provide commentary in plain English\n- Teach users simple market behaviors\n\nPrompt includes:\n- Stock JSON (`summary`)\n- Timestamp (`$now`)\n\n📌 Uses Slack-friendly markdown output.', { name: 'Sticky Note6', color: 4, position: [1400, -360], width: 360, height: 540 }))
  .add(sticky('', { name: 'Sticky Note7', color: 3, position: [740, 180], width: 220 }))
  .add(sticky('## 💬 Post to Slack\n\n**Node:** `Send Summary to User(s)`  \nSends the GPT-generated summary to Slack using:\n```js\n{{ $json.output }}\n```\n⚙️ Configured with the appropriate Slack user or channel.', { name: 'Sticky Note8', color: 4, position: [1760, -360], width: 220, height: 540 }))
  .add(sticky('', { name: 'Sticky Note9', color: 4, position: [1980, -360], width: 220, height: 540 }))
  .add(sticky('## 🤖 AI Assistant Prompt\n\nYou are a financial assistant writing a quick, readable market update for a general audience. Your job is to help people understand how well-known stocks are behaving — even if they aren’t professional traders.\n\nYou’ll be given:\n\nA list of stocks with technical indicators (e.g., momentum data)\nA timestamp (in RFC 3339 or ISO format) for when the data was pulled.\n📌 Your task:\nGroup the stocks into three categories:\n🟢 Buy Watchlist – Stocks showing signs of recovery or upward momentum\n⚪ Neutral Hold – Stocks with steady or unclear direction\n🔴 Caution / Sell – Stocks that appear overbought or may pull back\nFor each stock:\nWrite a short, plain-language insight about what’s happening\nUse familiar terms like “gaining steam,” “cooling off,” or “showing hesitation”\nAvoid technical jargon like RSI or MACD unless context makes it helpful\nAdd a helpful tip or comment for each stock (e.g.,\n“This pattern often signals hesitation” or\n“This dip might attract bargain hunters”)\nFinish with a summary line using the timestamp like this:\nSummary as of October 2, 2025 – Most stocks were stable with one or two worth watching.\n📦 Respond in Slack Markdown Only:\nExample Format:\n\n*📊 Market Summary (as of October 2, 2025)*\n\n🟢 *Buy Watchlist*  \n• TSLA – Recovering after a dip; gaining steam. This type of rebound often attracts early buyers.\n\n⚪ *Neutral Hold*  \n• AAPL – Holding steady. This often means the market is waiting on new developments.  \n• GOOGL – Moving sideways. A sign of consolidation before potential breakout.  \n• MSFT – Little movement. Could be digesting prior gains.  \n• NVDA – Slight back-and-forth. May indicate indecision in the market.\n\n🔴 *Caution / Sell*  \n• None at this time.\n\n_Summary as of October 2, 2025: Most stocks appear steady. TSLA could be one to watch if momentum holds._\n🚫 Do NOT:\nReturn raw JSON\nUse code blocks unless formatting Slack markdown (no YAML or tags)\nUse technical finance language unless simplified', { name: 'Sticky Note10', color: 5, position: [-640, -180], width: 660, height: 940 }))