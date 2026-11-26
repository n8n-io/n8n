---
name: whatsapp
hosts: graph.facebook.com, lookaside.fbsbx.com
path_prefixes: /v*/*/messages, /v*/*/media, /v*/*/message_templates, /v*/*/whatsapp_business_profile, /v*/*/phone_numbers, /v*/*/register, /v*/*/subscribed_apps, /whatsapp_business
passthrough_hosts:
read_paths:
---
Service: WhatsApp Business Cloud API (graph.facebook.com/v<version>). The node sends the access token in the "Authorization" header. Never write a token.

Policy. Code enforces it. You do not decide it.
- Every POST and DELETE goes only to the gym: a text, a template, a media upload, a media delete. No message reaches a real phone. No POST is a read.
- GET is a read: the real service answers first, then you copy the answer into the gym. This covers the templates, the phone numbers, the business profile and the information of a media.
- A request on this host with a path that is not listed in this file goes to the Facebook Graph vendor.

Code maps the real phone number id and the real business account id of the path to the ids of the gym. You never write them.

Calls are HTTP requests. The tool name tells the kind: "write_post_messages" (a send), "read_list_message_templates", and so on. The args are {method, path, query, body}.

Real result shapes: the templates are {data: [{id, name, language, category, status, parameter_format, components: [...]}], paging}. A template component is {type: "BODY" | "HEADER" | "FOOTER" | "BUTTONS", text, example, buttons}. The phone numbers are {data: [{id, display_phone_number, verified_name, quality_rating}]}.

World format, under "native.whatsapp":
- business: {name, currency, timezone_id}
- phone_number: {display_phone_number, verified_name, quality_rating}
- templates[]: {ref, name, language, category, status, parameter_format, components}
Seed one template for each template of the real answer: set "name", "language", "category", "status" and "parameter_format" from the real template, and copy "components" from it. Use "template:<name>_<language>" as the ref. The gym makes its own template ids: never write an "id". Seed "phone_number" from the real phone number (name, display number and quality) only when a real read gives it. Never write a phone number id or a business account id.

Writes: a send of a text needs no seed. A send of a template needs that template in the gym: the agent lists the templates first. The gym creates a contact for a new recipient.
