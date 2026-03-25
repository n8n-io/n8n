(function () {
    var Testem = window.Testem
    var regex = /^((?:not )?ok) (\d+) (.+)$/

    Testem.useCustomAdapter(tapAdapter)

    function tapAdapter(socket){
        var results = {
            failed: 0
            , passed: 0
            , total: 0
            , tests: []
        }

        socket.emit('tests-start')

        Testem.handleConsoleMessage = function(msg){
            var m = msg.match(regex)
            if (m) {
                var passed = m[1] === 'ok'
                var test = {
                    passed: passed ? 1 : 0,
                    failed: passed ? 0 : 1,
                    total: 1,
                    id: m[2],
                    name: m[3],
                    items: []
                }

                if (passed) {
                    results.passed++
                } else {
                    console.error("failure", m)

                    results.failed++
                }

                results.total++

                // console.log("emitted test", test)
                socket.emit('test-result', test)
                results.tests.push(test)
            } else if (msg === '# ok' || msg.match(/^# tests \d+/)){
                // console.log("emitted all test")
                socket.emit('all-test-results', results)
            }

            // return false if you want to prevent the console message from
            // going to the console
            // return false
        }
    }
}())
