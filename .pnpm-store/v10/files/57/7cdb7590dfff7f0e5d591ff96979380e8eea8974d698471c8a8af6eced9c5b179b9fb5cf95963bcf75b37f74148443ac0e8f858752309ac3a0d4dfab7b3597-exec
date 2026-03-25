const amqp = require('amqplib');

(async () => {
    try {
        const connection = await amqp.connect('amqp://localhost');
        process.once('SIGINT', connection.close);

        const channel = await connection.createChannel();
        const queue = 'my_first_stream';

        // Define the queue stream
        // Mandatory: exclusive: false, durable: true  autoDelete: false
        await channel.assertQueue(queue, {
            exclusive: false,
            durable: true,
            autoDelete: false,
            arguments: {
                'x-queue-type': 'stream',  // Mandatory to define stream queue
                'x-max-length-bytes': 2_000_000_000  // Set the queue retention to 2GB else the stream doesn't have any limit
            }
        });

        channel.qos(100);  // This is mandatory

        channel.consume(queue, (msg) => {
            console.log(" [x] Received '%s'", msg.content.toString());
            channel.ack(msg);  // Mandatory
        }, {
            noAck: false,
            arguments: {
                /*
                    Here you can specify the offset: : first, last, next, offset, timestamp and interval, i.e.

                    'x-stream-offset': 'first'
                    'x-stream-offset': 'last'
                    'x-stream-offset': 'next'
                    'x-stream-offset': 5
                    'x-stream-offset': { '!': 'timestamp', value: 1686519750 }
                    'x-stream-offset': '1h'

                    The timestamp must be the desired number of seconds since 00:00:00 UTC, 1970-01-01
                    The interval units can be Y, M, D, h, m, s

                */
                'x-stream-offset': 'first'
            }
        });

        console.log(' [*] Waiting for messages. To exit press CTRL+C');
    }
    // Catch and display any errors in the console
    catch(e) {
        console.log(e)
    }
})();
