import {
  IExecuteFunctions,
} from 'n8n-core';

import {
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';


import {
  OptionsWithUri,
} from 'request';

export class Dropcontact implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Dropcontact',
    name: 'dropcontact',
    icon: 'file:dropcontact.svg',
    group: ['transform'],
    version: 1,
    description: 'Find B2B emails and enrich contacts.',
    subtitle: '=Enrich: {{$parameter["resource"]}}',
    defaults: {
      name: 'Dropcontact',
      color: '#0ABA9F',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{
      name: 'DropcontactApi',
      required: true,
    },

  ],
  properties: [{
    displayName: 'Resource',
    noDataExpression: true,
    name: 'resource',
    type: 'options',
    options: [{
      name: 'Contact',
      value: 'contact',
      description: 'Find B2B emails and enrich your contact from his name and his website.',
    }, ],
    default: 'contact',
    required: true,
    description: 'What do you want to enrich ?',
  },

  {
    displayName: 'First Name',
    name: 'firstName',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        resource: [
          'contact',
        ],
      },
    },
    default: '',
    description: 'The first name of your contact.',
  },
  {
    displayName: 'Last Name',
    name: 'lastName',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        resource: [
          'contact',
        ],
      },
    },
    default: '',
    description: 'The last name of your contact.',
  },
  {
    displayName: 'Website',
    name: 'website',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        resource: [
          'contact',
        ],
      },
    },
    default: '',
    description: 'The website of your contact\'s company<br/>🔥 Your results will be better with the company website 🔥.',
  },
  {
    displayName: 'Company name',
    name: 'company',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        resource: [
          'contact',
        ],
      },
    },
    default: '',
    description: 'The company name of your contact.',
  },
  {
    displayName: 'Language',
    name: 'language',
    type: 'options',
    options: [{
      name: 'French',
      value: 'fr',
    },
    {
      name: 'English',
      value: 'en',
    },
  ],
  default: 'fr',
  required: true,
  description: 'Do you want your results in English or French.',
},
{
  displayName: '🇫🇷 Company enrich',
  name: 'siren',
  type: 'boolean',
  default: true,
  required: true,
  description: 'For French companies. 🇫🇷<br/>Get the SIREN number, NAF code, TVA number, company address and informations about the company leader.',
},

{
  displayName: 'Additional Fields',
  name: 'additionalFields',
  type: 'collection',
  placeholder: 'Add Field',
  default: {},
  displayOptions: {
    show: {
      resource: [
        'contact',
      ],
    },
  },
  options: [{
    displayName: 'Full Name',
    name: 'fullName',
    type: 'string',
    default: '',
  },
  {
    displayName: 'LinkedIn profile',
    name: 'linkedin',
    type: 'string',
    default: '',
  },
  {
    displayName: 'Phone number',
    name: 'phone',
    type: 'string',
    default: '',
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    default: '',
  },
  {
    displayName: 'SIREN Number',
    name: 'numSiren',
    type: 'string',
    default: '',
  },
  {
    displayName: 'SIRET Number',
    name: 'siret',
    type: 'string',
    default: '',
  },
  {
    displayName: 'Country',
    name: 'country',
    type: 'string',
    default: '',
  },
],
},
],
};

async execute(this: IExecuteFunctions): Promise < INodeExecutionData[][] > {
  const entryData = this.getInputData();
  const outputData = [];​
  const resource = this.getNodeParameter('resource', 0) as string;
  const credentials = await this.getCredentials('DropcontactApi');​
  if (credentials === undefined) {
    throw new NodeOperationError(this.getNode(), 'Oups, no credentials got returned!');
  }​
  if (resource === 'contact') {
    // --------------------------------------------------
    // For each contact provided by the previous node
    // create a search request
    // --------------------------------------------------
    const requestIds = [];
    for (let i = 0; i < entryData.length; i++) {
      // --------------------------------------------------
      // Check data coming from previous node, whether information are empty or not and set them to different variables
      // --------------------------------------------------
      let firstName, lastName, website, company, language, siren;
      let fullName, linkedin, email, phone, numSiren, siret, country;​
      if (this.getNodeParameter('firstName', i)) firstName = this.getNodeParameter('firstName', i) as string;
      if (this.getNodeParameter('lastName', i)) lastName = this.getNodeParameter('lastName', i) as string;
      if (this.getNodeParameter('website', i)) website = this.getNodeParameter('website', i) as string;​
      if (this.getNodeParameter('company', i)) company = this.getNodeParameter('company', i) as string;​
      if (this.getNodeParameter('language', i)) language = this.getNodeParameter('language', i) as string;​
      if (this.getNodeParameter('siren', i)) siren = this.getNodeParameter('siren', i) as boolean;​
      if (this.getNodeParameter('additionalFields', i)) {
        const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
        if (additionalFields) {
          if (additionalFields.fullName) fullName = additionalFields.fullName as string;
          if (additionalFields.linkedin) linkedin = additionalFields.linkedin as string;
          if (additionalFields.email) email = additionalFields.email as string;
          if (additionalFields.phone) phone = additionalFields.phone as string;
          if (additionalFields.numSiren) numSiren = additionalFields.numSiren as string;
          if (additionalFields.siret) siret = additionalFields.siret as string;
          if (additionalFields.country) country = additionalFields.country as string;
        }
      }​
      // --------------------------------------------------
      // Set fields in the search query, if entry data is empty, data will not be included in the search query
      // --------------------------------------------------
      const contactToSearch: {[k: string]: any} = {};
      if (firstName) contactToSearch.first_name = firstName;
      if (lastName) contactToSearch.last_name = lastName;
      if (website) contactToSearch.website = website;
      if (company) contactToSearch.company = company;
      if (language) contactToSearch.language = language;
      if (siren) contactToSearch.siren = siren;
      if (fullName) contactToSearch.full_name = fullName;
      if (linkedin) contactToSearch.linkedin = linkedin;
      if (email) contactToSearch.email = email;
      if (phone) contactToSearch.phone = phone;
      if (numSiren) contactToSearch.numSiren = numSiren;
      if (siret) contactToSearch.siret = siret;
      if (country) contactToSearch.country = country;​​

      // --------------------------------------------------
      // Execute the search request and check if request_id is present in the response
      // --------------------------------------------------
      const searchRequestOptions: OptionsWithUri = {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': credentials.apiKey,
        },
        method: 'POST',
        body: {
          'data': [
            contactToSearch
          ],
          'siren': siren,
          'language': language
        },
        uri: 'https://api.dropcontact.io/batch',
        json: true,
      };​
      let requestId;
      try {
        let searchRequest = await this.helpers.request(searchRequestOptions);​
        if (!searchRequest.request_id) {
          throw new NodeApiError(this.getNode(), { message: 'No request_id found for search request.' });
        }
        requestId = searchRequest.request_id;
      } catch (error) {
        throw new NodeApiError(this.getNode(), error);
      }​
      requestIds.push(requestId);
    }​


    // --------------------------------------------------
    // Waiting time
    // --------------------------------------------------
    const delay = (ms: any) => new Promise(res => setTimeout(res, ms));
    await delay(45000)​​


    // --------------------------------------------------
    // For each requestId in requestIds array
    // retrieve contact search result
    // --------------------------------------------------
    for (const index in requestIds) {
      const resultsRequestOptions: OptionsWithUri = {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': credentials.apiKey,
        },
        method: 'GET',
        uri: 'https://api.dropcontact.io/batch/' + requestIds[index],
        json: true,
      };​
      let resultsRequest;
      try {
        resultsRequest = await this.helpers.request(resultsRequestOptions);
      } catch (error) {
        throw new NodeApiError(this.getNode(), error);
      }​
      outputData.push(resultsRequest);
    }
  }​
  // --------------------------------------------------
  // Return the array containing all results to the next node
  // --------------------------------------------------
  return [this.helpers.returnJsonArray(outputData)];
}
}
