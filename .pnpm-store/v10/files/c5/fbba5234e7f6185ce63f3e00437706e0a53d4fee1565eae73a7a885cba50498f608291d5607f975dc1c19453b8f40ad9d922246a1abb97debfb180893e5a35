var vm = require('vm');

window.addEventListener('load', function () {
    var res = vm.runInNewContext('a + 5', { a : 100 });
    document.querySelector('#res').textContent = res;
});
