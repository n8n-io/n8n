seq-queue - queue to keep request process in sequence
=====================================================

Seq-queue is simple tool to keep requests to be executed in order.

As we known, Node.js codes run in asynchronous mode and the callbacks are unordered. But sometimes we may need the requests to be processed in order. For example, in a game, a player would do some operations such as turn right and go ahead. And in the server side, we would like to process these requests one by one, not do them all at the same time.

Seq-queue takes the responsibility to make the asynchronous, unordered processing flow into serial and ordered. It's simple but not a repeated wheel.

Seq-queue is a FIFO task queue and we can push tasks as we wish, anytime(before the queue closed), anywhere(if we hold the queue instance). A task is known as a function and we can do anything in the function and just need to call `task.done()` to tell the queue current task has finished. It promises that a task in queue would not be executed util all tasks before it finished.

Seq-queue add timeout for each task execution. If a task throws an uncaught exception in its call back or a developer forgets to call `task.done()` callback, queue would be blocked and would not execute the left tasks. To avoid these situations, seq-queue set a timeout for each task. If a task timeout, queue would drop the task and notify develop by a 'timeout' event and then invoke the next task. Any `task.done()` invoked in a timeout task would be ignored.

 * Tags: node.js

##Installation
```
npm install seq-queue
```

##Usage
``` javascript
var seqqueue = require('seq-queue');

var queue = seqqueue.createQueue(1000);

queue.push(
  function(task) {
    setTimeout(function() {
      console.log('hello ');
      task.done();
    }, 500);
  }, 
  function() {
    console.log('task timeout');
  }, 
  1000
);

queue.push(
  function(task) {
    setTimeout(function() {
      console.log('world~');
      task.done();
    }, 500);
  }
);
``` 

##API
###seqqueue.createQueue(timeout)
Create a new queue instance. A global timeout value in ms for the new instance can be set by `timeout` parameter or use the default timeout (3s) by no parameter.

###queue.push(fn, ontimeout, timeout)
Add a task into the queue instance. 
####Arguments
+ fn(task) - The function that describes the content of task and would be invoke by queue. `fn` takes a arguemnt task and we *must* call task.done() to tell queue current task has finished.
+ ontimeout() - Callback for task timeout. 
+ timeout - Timeout in ms for `fn`. If specified, it would overwrite the global timeout that set by `createQueue` for `fn`.

###queue.close(force)
Close the queue. A closed queue would stop receiving new task immediately. And the left tasks would be treated in different ways decided by `force`.
####Arguments
+ force - If true, queue would stop working immediately and ignore any tasks left in queue. Otherwise queue would execute the tasks in queue and then stop.

##Event
Seq-queue instances extend the EventEmitter and would emit events in their life cycles.
###'timeout'(totask)
If current task not invoke task.done() within the timeout ms, a timeout event would be emit. totask.fn and totask.timeout is the `fn` and `timeout` arguments that passed by `queue.push(2)`.
###'error'(err, task)
If the task function (not callbacks) throws an uncaught error, queue would emit an error event and passes the err and task informations by event callback arguments.
###'closed'
Emit when the close(false) is invoked.
###'drained'
Emit when close(true) is invoked or all tasks left have finished in closed status.
