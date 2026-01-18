return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-3456, 1056], name: 'Execute to Start' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'key',
            type: 'string',
            value: 'value'
          },
          {
            id: 'b5f030f4-6650-4181-881f-de44790bb24b',
            name: 'another_key',
            type: 'string',
            value: 'another_value'
          }
        ]
      }
    }, position: [-3104, 1056], name: 'Key & Value' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_string',
            type: 'string',
            value: 'This is a simple string. In JSON, it\'s always enclosed in double quotes.'
          }
        ]
      }
    }, position: [-2816, 1056], name: 'String' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_integer',
            type: 'number',
            value: 10
          },
          {
            id: '12345',
            name: 'json_example_float',
            type: 'number',
            value: 12.5
          }
        ]
      }
    }, position: [-2528, 1056], name: 'Number' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_boolean',
            type: 'boolean',
            value: false
          }
        ]
      }
    }, position: [-2240, 1056], name: 'Boolean' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_null',
            type: 'null',
            value: {}
          }
        ]
      }
    }, position: [-1952, 1056], name: 'Null' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_array',
            type: 'array',
            value: '["first element", 2, false, null]'
          }
        ]
      }
    }, position: [-1664, 1056], name: 'Array' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'json_example_object',
            type: 'object',
            value: '{"key":"value","array":[1,2,3],"boolean":false,"integer":123,"sub_object":{"sub_key":"Find me!"}}'
          }
        ]
      }
    }, position: [-1360, 1056], name: 'Object' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'message',
            type: 'string',
            value: '=Hello, the number from the tutorial is: {{ $(\'Number\').item.json.json_example_integer }}'
          },
          {
            id: '61f385f4-b8e2-4c69-b873-9ffc3ab3fe94',
            name: 'sub_key',
            type: 'string',
            value: '={{ $json.json_example_object.sub_object.sub_key }}'
          },
          {
            id: 'bd752a0f-64bf-44b1-b39b-fca28e86aa5b',
            name: 'array_second_item',
            type: 'string',
            value: '={{ $json.json_example_object.array[1] }}'
          }
        ]
      }
    }, position: [-1024, 1056], name: 'Using JSON (Expressions)' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e87952cb-878e-4feb-8261-342eaf887838',
            name: 'summary_string',
            type: 'string',
            value: '={{ $(\'String\').item.json.json_example_string }}'
          },
          {
            id: '12345',
            name: 'summary_number',
            type: 'number',
            value: '={{ $(\'Number\').item.json.json_example_integer }}'
          },
          {
            id: '67890',
            name: 'summary_boolean',
            type: 'boolean',
            value: '={{ $(\'Boolean\').item.json.json_example_boolean }}'
          },
          {
            id: 'abcde',
            name: 'summary_null',
            type: 'null',
            value: '={{ $(\'Null\').item.json.json_example_null }}'
          },
          {
            id: 'fghij',
            name: 'summary_array',
            type: 'array',
            value: '={{ $(\'Array\').item.json.json_example_array }}'
          },
          {
            id: 'klmno',
            name: 'summary_object',
            type: 'object',
            value: '={{ $(\'Object\').item.json.json_example_object }}'
          }
        ]
      }
    }, position: [-672, 1056], name: 'Final Exam' } }))
  .add(sticky('## Tutorial - What is JSON?\n\nWelcome! This workflow will teach you the basics of JSON, the language that apps and n8n nodes use to exchange information.\n\n**What is JSON?**\nImagine a contact card:\n- **Name:** John Doe\n- **Age:** 30\n- **Has Children:** Yes\n- **Phone Numbers:** ["555-1234", "555-5678"]\n\n\nJSON is just a way of writing this down so a computer can understand it perfectly.\n\n**How to use this tutorial:**\n1.  Click **"Execute Workflow"** button.\n2.  Click on each node, one by one, in order.\n3.  Look at the node\'s output in the panel on the right and read the associated sticky note to understand what\'s happening.', { position: [-3680, 560], width: 460, height: 656 }))
  .add(sticky('#### The Heart of JSON: Key & Value\n\nEverything in JSON is built on this pair:\n- A **Key** (the name of the data, always in double quotes `"`).\n- A **Value** (the data itself).\n\n\n`"key": "value"`\n\nIn this node\'s output, you see two key/value pairs. This is the basic building block for everything that follows.', { name: 'Sticky Note1', color: 7, position: [-3184, 704], width: 260, height: 516 }))
  .add(sticky('#### Data Type: String\n\nA string is simply **text**.\n- **Syntax:** The text is always enclosed in double quotes `" "`.\n\n\nLook at the output: the value of `json_example_string` is the text we defined.', { name: 'Sticky Note2', color: 7, position: [-2896, 704], width: 260, height: 516 }))
  .add(sticky('#### Data Type: Number\n\nThis is simply a number. It can be a whole number (integer) like 10, or a decimal (float) like 12.5.\n- **Syntax:** Just write the number directly, **WITHOUT quotes**.\n\n\n`"age": 30` (Correct)\n`"age": "30"` (Incorrect, this is a String!)\n\nThis distinction is crucial for doing math!', { name: 'Sticky Note3', color: 7, position: [-2608, 704], width: 260, height: 516 }))
  .add(sticky('#### Data Type: Boolean\n\nThis is a value that can only be **TRUE** or **FALSE**.\n- **Syntax:** `true` or `false` (always lowercase and **WITHOUT quotes**).\n\n\nThink of it like a light switch: on (`true`) or off (`false`). It\'s very useful for conditions (If/Then logic).', { name: 'Sticky Note4', color: 7, position: [-2320, 704], width: 260, height: 516 }))
  .add(sticky('#### Data Type: Array\n\nAn array is an **ordered list** of items.\n- **Syntax:** Starts with `[` and ends with `]`. Items are separated by commas.\n\n\nAn array can hold anything: strings, numbers, booleans, and even other arrays or objects!', { name: 'Sticky Note5', color: 7, position: [-1744, 704], width: 260, height: 516 }))
  .add(sticky('#### Data Type: Object (JSON Object)\n\nThis is the main concept! An object is a **collection of key/value pairs**.\n- **Syntax:** Starts with `{` and ends with `}`.\n\n\nThis is what allows us to structure complex data, like our contact card from the beginning. Notice how this object contains all the other data types we\'ve seen!', { name: 'Sticky Note6', color: 7, position: [-1456, 704], width: 280, height: 516 }))
  .add(sticky('#### Data Type: Null\n\nThis special type means "nothing," "no value," or "empty."\n- **Syntax:** `null` (lowercase and **WITHOUT quotes**).\n\n\nIt\'s different from `0` (which is a number) or `""` (which is an empty string). `null` is the intentional absence of a value.', { name: 'Sticky Note7', color: 7, position: [-2032, 704], width: 260, height: 516 }))
  .add(sticky('#### ⭐ THE KEY STEP: Using JSON in n8n!\n\nNow for the magic. How do you use data from a previous node? With **expressions** `{{ }}`.\n\nThis node creates a custom message. Look at the value of the `message` field:\n`Hello, the number from the tutorial is: {{ $(\'Number\').item.json.json_example_integer }}`\n\nIt dynamically pulled the number `10` from the "Number" node! This is how you make your nodes talk to each other.', { name: 'Sticky Note8', color: 5, position: [-1152, 704], width: 340, height: 516 }))
  .add(sticky('#### 🎓 FINAL EXAM: Putting It All Together\n\nThis last node creates a final object by using expressions to pull data from **all the previous nodes**.\n\nClick on this node and look at the expressions in each field. It\'s a perfect summary of everything you\'ve learned.\n\n**Congratulations! You now understand the basics of JSON and how to use it in n8n.**', { name: 'Sticky Note9', color: 6, position: [-784, 704], width: 340, height: 516 }))
  .add(sticky('## Was this helpful? Let me know!\n[![clic](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/clic_down_lucas.gif)](https://api.ia2s.app/form/templates/academy)\n\nI really hope this tutorial helped you understand JSON better. Your feedback is incredibly valuable and helps me create better resources for the n8n community.\n\n### **Have Feedback, a Question, or a Project Idea?**\n\nI\'ve streamlined the way we connect. It all starts with one simple form that takes less than 10 seconds. After that, you\'ll chat with my AI assistant who will gather the key details and pass them directly on to me.\n\n#### ➡️ **[Click here to start the conversation](https://api.ia2s.app/form/templates/academy)**\n\nUse this single link for anything you need:\n\n*   **Give Feedback:** Share your thoughts on this template—whether you found a typo, encountered an unexpected error, have a suggestion, or just want to say thanks!\n\n*   **n8n Coaching:** Get personalized, one-on-one guidance to master n8n. We can work together to get you launched with confidence or help you reach an expert level.\n\n*   **n8n Consulting:** Have a complex business challenge or need a custom workflow built from scratch? Let\'s partner on a powerful automation solution tailored to your specific needs.\n\n---\n\nHappy Automating!\nLucas Peyrin | [n8n Academy](https://n8n.ac)', { name: 'Sticky Note10', color: 3, position: [-416, 16], width: 540, height: 1200 }))
  .add(sticky('## [Video Tutorial](https://youtu.be/PAmgrwYnzWs?si=yXG1oHIL3UiBcAPa)\n@[youtube](PAmgrwYnzWs)', { name: 'Sticky Note11', color: 2, position: [-3680, 240], width: 460, height: 300 }))
  .add(sticky('[![Execute Workflow](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/execute_workflow_json_tutorial.gif)](https://www.youtube.com/watch?v=PAmgrwYnzWs)', { name: 'Sticky Note14', color: 7, position: [-3184, 288], width: 576, height: 392 }))
  .add(sticky('## [>> Go to Eval Workflow <<](https://n8n.io/workflows/6232)\n\nVerify your skills with a complete eval workflow to put your JSON Skills to the test.\n[![Test Skills](https://supastudio.ia2s.app/storage/v1/object/public/assets/n8n/test_your_skillls_button.gif)](https://n8n.io/workflows/6232)', { name: 'Sticky Note15', color: 6, position: [-784, 368], width: 336, height: 312 }))