# Session is the conversation unit

Product Agents already say “session” in the UI. We use Session as this context’s word for the durable conversation, not thread or conversation. New file APIs and specs say Session. Existing thread routes and tables stay; a Session id is that thread id. Chat Hub also uses session for a different product; that collision is accepted because Chat Hub is out of this context.

**Considered Options**: Thread as the domain word; conversation as the domain word; rename existing thread APIs in this work.
