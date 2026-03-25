# stream-combiner

<img src=https://secure.travis-ci.org/dominictarr/stream-combiner.png?branch=master>

## Combine (stream1,...,streamN)

Turn a pipeline into a single stream. `pipeline` returns a stream that writes to the first stream
and reads from the last stream. 

Listening for 'error' will recieve errors from all streams inside the pipe.

``` js
  var Combine = require('stream-combiner')
  var es      = require('event-stream')

  Combine(                         //connect streams together with `pipe`
    process.openStdin(),              //open stdin
    es.split(),                       //split stream to break on newlines
    es.map(function (data, callback) {//turn this async function into a stream
      callback(null
        , inspect(JSON.parse(data)))  //render it nicely
    }),
    process.stdout                    // pipe it to stdout !
    )
```

## License

MIT
