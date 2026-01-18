return workflow('mtCQYada6O64BILe', 'Building Prospecting Lists', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-1780, 125], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.surfe.com/v2/companies/search',
      method: 'POST',
      options: { redirect: { redirect: {} } },
      jsonBody: '{\n  "filters": {\n    "industries": ["Software", "Apps", "SaaS"],\n    "employeeCount": {\n        "from": 1,\n        "to": 35\n      },\n    "countries": ["FR"],\n    "revenues": ["1-10M"]\n  },\n  "limit": 20\n}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth'
    }, position: [-1560, 125], name: 'Search ICP Companies' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const companies = $json.companyDomains || [];\n\nreturn {\n    "companies": {\n      "domains": companies\n    },\n    "limit": 20\n  };\n\n'
    }, position: [-1340, 125], name: 'prepare JSON PAYLOAD WITH Company Domains' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.surfe.com/v2/people/search',
      method: 'POST',
      options: { redirect: { redirect: {} } },
      jsonBody: '={{ $json }}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth'
    }, position: [-1120, 125], name: 'Search People in Companies' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const people = $json.people || [];\n\nreturn [\n  {\n    json: {\n      "include": {\n        "email": true,\n        "linkedInUrl": false,\n        "mobile": true\n      },\n      "notificationOptions": {\n        "webhookUrl": ""\n      },\n      people: people.map((person) => ({\n        firstName: person.firstName || "",\n        lastName: person.lastName || "",\n        companyName: person.companyName || "",\n        companyDomain: person.companyDomain || "",\n        linkedinUrl: person.linkedInUrl || "",\n        externalID: `${person.firstName}_${person.lastName}_${person.companyDomain}`.toLowerCase().replace(/[^a-z0-9_]/g, \'_\')\n      }))\n    }\n  }\n];'
    }, position: [-900, 125], name: 'Prepare JSON Payload Enrichment Request' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.surfe.com/v2/people/enrich',
      method: 'POST',
      options: { redirect: { redirect: {} } },
      jsonBody: '={{ $json }}',
      sendBody: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth'
    }, position: [-680, 125], name: 'Surfe Bulk Enrichments API' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.surfe.com/v2/people/enrich/{{ $json.enrichmentID }}',
      options: { redirect: { redirect: {} } },
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBearerAuth'
    }, position: [-460, 125], name: 'Surfe check enrichement status' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const people = $json.people || [];\n\nreturn people.map(person => {\n  return {\n    json: {\n      id: person.id || \'\',\n      firstName: person.firstName || \'\',\n      lastName: person.lastName || \'\',\n      email: person.emails?.[0]?.email || \'\',\n      phone: person.mobilePhones?.[0]?.mobilePhone || \'\',\n      jobTitle: person.jobTitle || \'\',\n      companyName: person.companyName || \'\',\n      companyWebsite: person.companyDomain || \'\',\n      linkedinUrl: person.linkedInUrl || \'\',\n      country: person.country || \'\',\n      status: person.status || \'\'\n    }\n  };\n});'
    }, position: [-20, 0], name: 'Extract list of peoples from Surfe API response' } }), node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 3 }, position: [-20, 225], name: 'Wait 3 secondes' } })], { version: 2.2, parameters: {
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
            id: '65a670df-84e8-4c87-956c-96758b8d8d26',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.status }}',
            rightValue: 'COMPLETED'
          }
        ]
      }
    }, name: 'Is enrichment complete ?' }))
  .then(node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { parameters: {
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
            id: '4f8f9bec-6eee-4e62-8d5f-e8f5b85620d6',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            leftValue: '={{ $json.phone }}',
            rightValue: ''
          },
          {
            id: '007f5a66-4e2a-42bc-bbed-0fb2b2f39ae7',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            leftValue: '={{ $json.email }}',
            rightValue: ''
          }
        ]
      }
    }, position: [200, 0], name: 'Filter: phone AND email' } }))
  .then(node({ type: 'n8n-nodes-base.hubspot', version: 2.1, config: { parameters: {
      email: '={{ $json.email }}',
      options: { resolveData: false },
      authentication: 'appToken',
      additionalFields: {
        country: '={{ $json.country }}',
        jobTitle: '={{ $json.jobTitle }}',
        lastName: '={{ $json.lastName }}',
        firstName: '={{ $json.firstName }}',
        websiteUrl: '={{ $json.linkedinUrl }}',
        companyName: '={{ $json.companyName }}',
        phoneNumber: '={{ $json.phone }}'
      }
    }, position: [420, 0], name: 'HubSpot: Create or Update' } }))
  .then(node({ type: 'n8n-nodes-base.gmail', version: 2.1, config: { parameters: {
      sendTo: '<YOUR_EMAIL>',
      message: 'Your ICP prospecting enrichment is done.',
      options: {},
      subject: 'Your ICP prospecting enrichment is done.'
    }, position: [640, 0] } }))