return workflow('vqN5q4DY1j8QQdck', 'AI-Powered LinkedIn Post Automation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'LinkedIn Post Generator ',
      formFields: {
        values: [
          {
            fieldLabel: 'Topic',
            placeholder: 'Enter prompt here....',
            requiredField: true
          }
        ]
      }
    }, name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '694a158d-53fd-425c-9a42-be4288c17ac9',
            name: 'chatInput',
            type: 'string',
            value: '={{ $json.Topic }}'
          }
        ]
      }
    }, position: [260, 0], name: 'Mapper' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      options: {
        systemMessage: '=I need help creating a professional LinkedIn post for the topic: "{{ $json.chatInput }}". The output should include:\n\n1. **LinkedIn Post Content**:\n   - Write an engaging and informative LinkedIn post on the topic " {{ $json.chatInput }}".\n   - Start with an attention-grabbing hook that entices readers to read further.\n   - Provide valuable insights or actionable tips related to the topic.\n   - The tone should be professional, clear, and concise, using language that\'s easy to understand.\n   - End with a call to action (CTA) encouraging the audience to engage, reflect, or share their thoughts.\n   - Include relevant hashtags to increase engagement and visibility on LinkedIn. Make sure these hashtags are specific to the topic and aligned with trending keywords for LinkedIn posts.\n\n2. Image Generation Prompt:\n\nVisual Aesthetic:\nThe image should align with LinkedIn\'s professional and corporate atmosphere. Make sure it conveys sophistication, modernity, and relevance to the topic. Avoid overly busy designs.\n\nColor Palette:\nStick to corporate tones such as blues, whites, and grays to maintain a professional and clean look. Consider using gradients for depth or subtle contrasts to highlight key elements.\n\nImagery:\n\nFocus on visualizing the topic of the post. For AI in Business, this could involve:\n\nA futuristic office or workspace setting, highlighting cutting-edge technologies.\n\nIcons or symbols that represent data analysis, AI, or automation.\n\nVisuals of humans interacting with AI systems (e.g., robots working alongside humans or using AI tools).\n\nAbstract representations of neural networks or digital data flows.\n\nNo Text Overlay:\n\nDo not include any text in the image, ensuring it remains clean and focuses solely on the visuals.\n\nText overlays or titles are not necessary in this case to keep the professional look intact.\n\nStyle and Tone:\n\nThe design should be minimalist, modern, and sleek. Use a balanced layout with a focus on professional imagery that resonates with business-minded audiences.\n\nAvoid overly complex or distracting backgrounds—keep it clean and visually appealing.\n\nFont Style (if applicable):\n\nIf any text were used in future visuals or branding (though none should appear in this image), use clean, modern fonts like Helvetica, Arial, or Roboto—sans-serif fonts that are readable and professional.\n\nimage prompt can be like this short and simple\nA modern co-working space where AI assistants and human employees brainstorm around a digital whiteboard. The scene shows innovation and teamwork, with a multicultural group, smart gadgets, and subtle futuristic elements. Warm natural lighting and a balanced, professional layout ideal for a LinkedIn audience.\n the JSON output would look like this:\n{\n  "post_content": {\n    "text": "The Future of AI in Business: How It is Transforming Industries 🚀\\n\\nAI in Business is no longer just a buzzword; it\'s revolutionizing the way businesses operate today. From improving efficiency to driving innovation, AI is an essential tool for modern companies.\\n\\nHere are some key insights on how AI in Business is shaping the future of industries:\\n1. Enhanced Data Analytics: AI helps businesses make data-driven decisions with greater accuracy.\\n2. Automation of Tasks: AI is automating repetitive tasks, improving operational efficiency.\\n3. Personalized Experiences: AI is enabling personalized customer experiences in real-time.\\n\\nIs your business ready to embrace AI in Business? Let\'s discuss how it can help drive growth and innovation.\\n\\n#AIinBusiness #Innovation #FutureOfWork #BusinessGrowth #TechnologyTrends #DigitalTransformation"\n  },\n  "image_prompt": {\n    "description": "Create an image for a LinkedIn post on the topic of AI in Business. The image should:\\n- Feature modern, sleek visuals that align with the corporate tone of LinkedIn.\\n- Visualize AI in Business through elements like a futuristic office, AI-powered systems, or human-robot collaboration.\\n- Use a professional color palette like blues, whites, and grays.\\n- The optional text overlay (if relevant) could be something like \'The Future of AI in Business\' or \'Driving Innovation with AI\'.\\n- The design should use clean, modern fonts that are easily readable and match the professional style of LinkedIn posts."\n  }\n}\n'
      }
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [500, 0], name: 'AI Agent' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const input = $input.first().json.output\n\nconst cleanedInput = input.replace(/```json|```/g, \'\').trim();\n\n// Parse the cleaned JSON\nconst parsedOutput = JSON.parse(cleanedInput);\n\n// Extract the `post_content.text` and `image_prompt.description` details\nconst postContent = parsedOutput.post_content.text;\nconst imagePrompt = parsedOutput.image_prompt.description;\n\n// Prepare the final output in the desired JSON structure\nreturn {\n  post_content: postContent,\n  image_prompt: imagePrompt\n};'
    }, position: [880, 0], name: 'Normalizer' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://gen-imager.p.rapidapi.com/genimager/index.php',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      sendHeaders: true,
      bodyParameters: {
        parameters: [{ name: 'Prompt', value: '={{ $json.image_prompt }}' }]
      },
      headerParameters: {
        parameters: [
          { name: 'x-rapidapi-host', value: 'gen-imager.p.rapidapi.com' },
          {
            name: 'x-rapidapi-key',
            value: 'your gen-imager rapid api key'
          }
        ]
      }
    }, position: [1180, 0], name: 'Text to image' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Extract the data field (which is a string) and parse it into a JSON object\nconst dataString = $input.first().json.data;\n\n// Parse the data string into a valid JSON object\nconst dataObject = JSON.parse(dataString);\n\n// Now you can safely extract the base64 image data\nconst base64Image = dataObject.base64_img;\n\n// Decode the base64 string and create a buffer from it\nconst buffer = Buffer.from(base64Image, \'base64\');\n\n// You can optionally store this buffer in a temporary file or return the buffer as-is\nreturn {\n  json: {\n    decoded_image_buffer: buffer.toString(\'base64\'), // Returning as base64 for further processing\n    image_length: buffer.length, // Optional: To verify the size of the decoded image\n  }\n};\n'
    }, position: [1460, 0], name: 'Decoder' } }))
  .then(node({ type: 'n8n-nodes-base.linkedIn', version: 1, config: { parameters: {
      text: '={{ $(\'Normalizer\').item.json.post_content }}',
      additionalFields: {},
      binaryPropertyName: '={{ $json.decoded_image_buffer }}',
      shareMediaCategory: 'IMAGE'
    }, position: [1760, 0], name: 'LinkedIn' } }))
  .add(sticky('> **AI-Powered LinkedIn Post Automation**  \n>  \n> This workflow automates the process of creating LinkedIn posts based on user-submitted topics. It generates both **content** and a **professional image** using AI, and automatically publishes the post to LinkedIn.\n>  \n> - **Trigger**: Activated when a user submits a form with a topic for a LinkedIn post.\n> - **AI Content Generation**: Uses Google Gemini to generate an engaging post and image prompt.\n> - **Image Creation**: The prompt is sent to **[gen-imager API](https://rapidapi.com/PrineshPatel/api/gen-imager)** for image generation.\n> - **Post Creation**: The generated text and image are posted directly to LinkedIn.\n>  \n> **Key Features**:  \n> 1. Automated post creation for LinkedIn.  \n> 2. Professional image generation with an AI-driven prompt.  \n> 3. Instant publishing to your LinkedIn feed.\n', { name: 'Sticky Note', position: [-500, -300], height: 700 }))
  .add(sticky('**On Form Submission**  \n> Triggered when a user submits a topic through the form. This starts the workflow and captures the topic to generate a LinkedIn post.\n  ', { name: 'Sticky Note1', position: [-60, -160], height: 320 }))
  .add(sticky('> **Mapper**  \n> Maps the user-submitted topic from the form and prepares it for the next step by assigning it to a variable (`chatInput`).\n', { name: 'Sticky Note2', position: [200, -160], height: 320 }))
  .add(sticky('**AI Agent**  \n> Uses the **Google Gemini** model to generate professional content for the LinkedIn post, including text and an image prompt based on the given topic.\n', { name: 'Sticky Note3', position: [480, -160], width: 300, height: 320 }))
  .add(sticky(' **Normalizer**  \n> Cleans and formats the AI-generated output into a readable structure for the next steps, extracting both the post text and image prompt.\n', { name: 'Sticky Note4', position: [820, -160], height: 320 }))
  .add(sticky('> **Text to Image**  \n> Sends the image prompt to the **[gen-imager API](https://rapidapi.com/PrineshPatel/api/gen-imager)** to generate a professional image for the LinkedIn post based on the given topic.\n', { name: 'Sticky Note5', position: [1100, -160], height: 320 }))
  .add(sticky('**Decoder**  \n> Decodes the image from its base64 format into a usable binary buffer that can be uploaded to LinkedIn.\n', { name: 'Sticky Note6', position: [1380, -160], height: 320 }))
  .add(sticky('> **LinkedIn**  \n> Publishes the generated LinkedIn post, including the text and the newly created image, directly to the user\'s LinkedIn profile.\n', { name: 'Sticky Note7', position: [1680, -160], height: 320 }))