

# Context

We're part of a company-wide hackaton day in n8n. The demo we want to create is a minimal binary written in rust that is able to run workflows having a few selected node types, by reading the workflow and nodes configuration from the current n8n format.

# Requirements

- The rust implementation will ship a minimal workflow execution engine that runs nodes sequentially, similar to what n8n already does today on master. 
- Our rust implementation will NOT support graph loops, nor merge nodes.
- The binary will contain the nodes implementations as well, we're NOT aiming for dynamic nodes loading, this will all be statically baked into the executable.
- The mechanisms that move data across node can mimic what n8n does through items array, however we should build the simplest possible thing for now.
- The configuration will be passed to the binary as a command line option, and the binary will immediately start executing the workflow. 
- The binary should be able to run multiple "instances" of the workflow at the same time, from the supported trigger (webhook)
- Once the workflow is complete, it should be able to report back to n8n using the current APIs. We're not interested in reporting individual nodes execution for the time being.
- The nodes configuration we are going to read should follow the one that n8n currently implements on master: we won't be _using_ all of it, but we'll be extracting only the parts that are needed to run this demo. All the remaining config will just be ignored.
- Nodes to implement:
    - webhook (will be the only "trigger" for this demo)
    - if node (one input, two output)
    - set node
    - respond to webhook
    - invoke http endpoint node

# Plan

1. Prepare my machine to compile rust. Download and setup the toolchain.
2. Implement the interfaces that will be implemented by the nodes we want to support and will be invoked by the engine (and call back into the engine as well). These should be minimal to support just the nodes we need.
3. Implement the core execution engine and test it with mock nodes version, to validate it works as expected.
4. Implement supported nodes one at time and test them
5. Define few real workflow configuration and test the execution engine is able to run them correctly.
6. Report each finished execution back to n8n through its current APIs. Research which API receives execution results, then implement the reporter that the engine calls after each execution.



