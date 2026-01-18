return workflow('oJXYeAsW2fEXu2CM', 'LinkedIn Post To Personalized Opener', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.1, config: { parameters: {
      path: '6fbe076d-b99c-4dea-8575-ec53ad0a6e0a',
      options: {},
      formTitle: 'LinkedIn Post Opener Generator',
      formFields: {
        values: [
          { fieldLabel: 'Author\'s First Name', requiredField: true },
          { fieldLabel: 'Company Name', requiredField: true },
          {
            fieldType: 'textarea',
            fieldLabel: 'LinkedIn Post Content',
            requiredField: true
          }
        ]
      },
      formDescription: 'Paste any LinkedIn post and get a personalized cold email opener that actually sounds human.'
    }, position: [1140, 760], name: 'LinkedIn Post Form' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get form data\nconst firstName = $json[\'Author\\\'s First Name\']?.trim();\nconst companyName = $json[\'Company Name\']?.trim();\nconst postContent = $json[\'LinkedIn Post Content\']?.trim();\n\n// Validate input\nif (!firstName || !companyName || !postContent) {\n  throw new Error(\'All fields are required\');\n}\n\nif (postContent.length < 50) {\n  throw new Error(\'Post too short. Need at least 50 characters for good personalization.\');\n}\n\n// Clean the post content\nconst cleanedPost = postContent\n  .replace(/\\s+/g, \' \')\n  .replace(/[\\r\\n]+/g, \' \')\n  .trim();\n\nreturn {\n  json: {\n    first_name: firstName,\n    company_name: companyName,\n    post_content: cleanedPost,\n    timestamp: new Date().toISOString()\n  }\n};'
    }, position: [1320, 760], name: 'Process Input' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 1.8, config: { parameters: {
      modelId: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
      options: { maxTokens: 150, temperature: 0.8 },
      messages: {
        values: [
          {
            content: 'You are an elite B2B sales expert who crafts personalized cold email openers that get responses.\n\nYour specialty: Taking LinkedIn posts and creating openers that feel like they came from someone who actually READ and UNDERSTOOD the content.\n\nRules:\n- Reference specific details, metrics, or insights from the post\n- Sound like a human, not a bot\n- Show genuine interest in their work/achievement\n- Avoid generic praise ("great post", "inspiring", "amazing")\n- Be conversational but professional\n- Focus on what makes this post unique\n\nComplete this sentence: "Came across your post on LinkedIn - "\n\nMake it feel like you\'re genuinely interested in what they shared, not just trying to sell them something.\n\nExamples of what works:\n- "Came across your post on LinkedIn - going from 5 to 50 employees in 18 months while maintaining 98% customer satisfaction is seriously impressive execution."\n- "Came across your post on LinkedIn - the insight about AI replacing tasks, not jobs, really resonates with what we\'re seeing in manufacturing right now."\n- "Came across your post on LinkedIn - bootstrapping to $2M ARR without external funding while building a distributed team is exactly the kind of scrappy growth I respect."\n\nOutput ONLY the completed sentence.'
          },
          {
            content: '=LinkedIn Post:\n{{ $json.post_content }}\n\nAuthor: {{ $json.first_name }}\nCompany: {{ $json.company_name }}'
          }
        ]
      }
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [1500, 760], name: 'AI Magic' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Get AI response and original data\nconst aiResponse = $input.first().json;\nconst originalData = $(\'Process Input\').first().json;\n\n// Extract the personalized opener\nconst opener = aiResponse.message?.content || aiResponse.text || "Something went wrong. Try again.";\n\n// Clean up the opener\nconst cleanOpener = opener\n  .replace(/^"|"$/g, \'\')\n  .replace(/^\'|\'$/g, \'\')\n  .trim();\n\n// Create final response\nconst response = {\n  success: true,\n  opener: cleanOpener,\n  prospect: originalData.first_name,\n  company: originalData.company_name,\n  next_steps: [\n    "1. Copy the opener above",\n    "2. Add your value prop (2-3 sentences max)",\n    "3. Include clear CTA",\n    "4. Send it"\n  ],\n  tips: [\n    "Keep total email under 100 words",\n    "Send Tuesday-Thursday, 8-10am",\n    "Follow up in 3-5 days if no response",\n    "Personalize the subject line too"\n  ]\n};\n\nreturn { json: response };'
    }, position: [1840, 760], name: 'Format Output' } }))
  .add(sticky('**Test with this (Copy & Paste):**\n\nAuthor: Shakira Johhson\n\nCompany: Apple\n\nPost:\n\nJust closed our Series B! 🚀 \n\nHonestly didn\'t think we\'d get here 2 years ago when we were bootstrapping in my garage. Now we\'re scaling our AI workflow automation to help 10,000+ businesses.\n\nShoutout to the team who believed in the vision when it was just sketches on a whiteboard. This is just the beginning.\n\n#TechCorp #SeriesB #AI #Automation\n\n**You\'ll get something like this:**\n\n"Came across your post on LinkedIn - from garage sketches to Series B is incredible, and the 10,000+ businesses you\'re helping with AI automation shows the real impact."\n\n**Pro tips:**\n- Use recent posts (last 30 days)\n- Longer posts = better personalization\n- Company updates work best\n- Achievement posts are gold', { name: 'Try This Example', position: [580, 580], width: 480, height: 600 }))
  .add(sticky('**What this does:**\n\n1. Fill out the form with LinkedIn post\n2. AI reads it like a human would\n3. Creates personalized opener\n4. You get copy-ready result\n\n**Why it works:**\n- References specific details\n- Sounds natural, not robotic\n- Shows you actually read their content\n- Builds instant credibility\n\n**Perfect for:**\n- Sales reps\n- Business development\n- Agency outreach\n- Partnership building\n\n**Setup:**\n1. Add OpenAI API key (Or, just use free n8n OpenAI credits)\n2. Test with example\n3. Start personalizing\n\nThat\'s it.', { name: 'What This Does', position: [1420, 140], width: 400, height: 560 }))
  .add(sticky('**Where to find your output:**\n\nClick on "Format Output" node after running the workflow.\n\nYou\'ll see:\n- **opener**: Your personalized email opener\n- **prospect**: The person\'s name\n- **company**: Their company name\n- **next_steps**: What to do next\n- **tips**: Email best practices\n\n**Save your results:**\n- Connect Google Sheets node\n- Add to your CRM\n- Send to email tool\n- Log in database\n\n**Make it yours:**\n- Edit the AI prompt for your industry\n- Add more form fields\n- Connect to your tools\n- Batch process multiple posts\n\n**Pro tip:** The output is structured JSON - easy to connect to any tool you use.', { name: 'Output & Next Steps', position: [1420, 980], width: 400, height: 280 }))
  .add(sticky('** Further connect to your tools:**\n- Google Sheets for logging\n- CRM for prospect data\n- Email tools for sending\n- Slack for notifications', { name: 'Why This Works', position: [2060, 740], width: 400, height: 140 }))