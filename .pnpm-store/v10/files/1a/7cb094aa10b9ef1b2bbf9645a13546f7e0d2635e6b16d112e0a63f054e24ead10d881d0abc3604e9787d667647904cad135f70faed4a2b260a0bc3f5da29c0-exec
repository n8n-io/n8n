const amqp = require('amqplib');


(async () => {
    try {
        const connection = await amqp.connect('amqp://localhost');
        process.once('SIGINT', connection.close);

        const channel = await connection.createChannel();
        const queue = 'my_first_stream';
        const msg = `Hello World! ${Date.now()}`;

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

        // Send the message to the stream queue
        await channel.sendToQueue(queue, Buffer.from(msg));
        console.log(" [x] Sent '%s'", msg);
        await channel.close();

        // Close connection
        connection.close();
    }
    // Catch and display any errors in the console
    catch(e) {
        console.log(e)
    }
})();

