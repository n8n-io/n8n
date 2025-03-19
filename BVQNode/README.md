# n8n-nodes-bvq

This is an n8n community node. It lets you use BVQ data in your n8n workflows.

BVQ is a cross-platform software designed for automated monitoring of your entire data center, including computing, SAN, and storage layers. It offers monitoring, reporting, alerting, and analysis functions with an intelligent connection to ITSM systems.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials) 
[Usage](#usage) 
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

In the UI there is a dropdown to select what data shall be retrieved from the BVQ API.
Currently only Alerts can be selected in the dropdown menu. 

If Alerts is selected the data based on the provided Unix timestamp will be retrieved since this timestamp. The data is submitted in json format and can be used for several use cases. 

## Credentials

Credentials such as username, password (which is a BVQ-Account) and the API-Base-URL are mandatory. 

## Usage

The data is submitted in json format and can be used for several use cases.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
