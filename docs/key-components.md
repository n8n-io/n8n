# Key Components


## Connection

A connection establishes a link between nodes to route data through the workflow. Each node can have one or multiple connections.


## Node

Example: Google Sheets Node. It can be used to retrieve or write data to a Google Sheet.

A node is an entry for retrieving data, a function to process data or an exit for sending data. Data process includes filtering, recomposing and changing data. There is one or several nodes for your API, service or app. You can easily connect multiple nodes, which allows you to create simple and complex workflows with them very intuitively.


## Trigger

Example: Trello Trigger Node. When a Trello Board gets updated, it will trigger a workflow to start using the data from the updated board.

A trigger-node is a node which starts a workflow and supplies the initial data. What triggers it, depends on the node. It could be the time, a webhook call or an event from an external service.


## Workflow

A workflow is a canvas, on which you can place and connect nodes. You define a trigger node(s), optionally function nodes which change the data in the flow or in external services. A workflow can be started manually
or by trigger nodes. A workflow run ends when all active and connected nodes have processed their data.
