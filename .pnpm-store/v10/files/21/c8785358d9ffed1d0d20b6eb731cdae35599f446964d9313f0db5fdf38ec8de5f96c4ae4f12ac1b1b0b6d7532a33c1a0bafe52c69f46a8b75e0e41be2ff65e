# RabbitMQ tutorials

This directory contains the [RabbitMQ tutorials][rabbitmq-tutes],
ported to amqplib. The sub-directory `callback_api` has translations
of the tutorial programs to the callback-oriented API.

## Preparation

To run the tutorial code, you need amqplib installed. Assuming you are
in a clone of the amqplib repository, from the tutorials directory:

    npm install

or to use the latest released version,

    npm install amqplib

Then just run each file as a script, e.g., in bash

    ./send.js

or

    node send.js

or

    nave use 0.8 node send.js

## [Tutorial one: Hello World!][tute-one]

A "Hello World" example, with one script sending a message to a queue,
and another receiving messages from the same queue.

 * [send.js](send.js)
 * [receive.js](receive.js)

## [Tutorial two: Work queues][tute-two]

Using RabbitMQ as a work queue; `new_task` creates a task, and
`worker` processes tasks. Multiple `worker` process will share the
tasks among them. Long-running tasks are simulated by supplying a
string with dots, e.g., '...' to `new_task`. Each dot makes the worker
"work" for a second.

 * [new_task.js](new_task.js)
 * [worker.js](worker.js)

## [Tutorial three: Publish/Subscribe][tute-three]

Using RabbitMQ as a broadcast mechanism. `emit_log` sends a "log"
message to a fanout exchange, and all `receive_logs` processes receive
log messages.

 * [emit_log.js](emit_log.js)
 * [receive_logs.js](receive_logs.js)

## [Tutorial four: Routing][tute-four]

Using RabbitMQ as a routing ('somecast') mechanism. `emit_log_direct`
sends a log message with a severity, and all `receive_logs_direct`
processes receive log messages for the severities on which they are
listening.

 * [emit_log_direct.js](emit_log_direct.js)
 * [receive_logs_direct.js](receive_logs_direct.js)

## [Tutorial five: Topics][tute-five]

Extends the previous tutorial to routing with wildcarded patterns.

 * [emit_log_topic.js](emit_log_topic.js)
 * [receive_logs_topic.js](receive_logs_topic.js)

## [Tutorial six: RPC][tute-six]

Using RabbitMQ as an RPC intermediary, queueing requests for servers
and routing replies back to clients.

 * [rpc_server.js](rpc_server.js)
 * [rpc_client.js](rpc_client.js)

I depart slightly from the original tutorial code, which I think has
some needless object-orientation (in the Python code; you don't get a
choice about needless object-orientation in Java).

[rabbitmq-tutes]: http://github.com/rabbitmq/rabbitmq-tutorials
[tute-one]: http://www.rabbitmq.com/tutorials/tutorial-one-javascript.html
[tute-two]: http://www.rabbitmq.com/tutorials/tutorial-two-javascript.html
[tute-three]: http://www.rabbitmq.com/tutorials/tutorial-three-javascript.html
[tute-four]: http://www.rabbitmq.com/tutorials/tutorial-four-javascript.html
[tute-five]: http://www.rabbitmq.com/tutorials/tutorial-five-javascript.html
[tute-six]: http://www.rabbitmq.com/tutorials/tutorial-six-javascript.html
