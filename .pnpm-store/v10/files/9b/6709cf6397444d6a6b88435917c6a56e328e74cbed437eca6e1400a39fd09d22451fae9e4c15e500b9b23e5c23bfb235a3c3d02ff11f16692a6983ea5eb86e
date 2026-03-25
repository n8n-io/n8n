import { SharedService, createSharedServicePort } from "./SharedService.js";

// This is a sample service. Only methods with structured cloneable
// arguments and results can be called by proxy.
const target = {
  async add(x, y) {
    log(`evaluating ${x} + ${y}`);
    return x + y;
  },

  multiply(x, y) {
    log(`evaluating ${x} * ${y}`);
    return x * y;
  },

  async slow_subtract(x, y) {
    log(`evaluating ${x} - ${y} with 5s delay`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return x - y;
  },

  throw_error(x, y) {
    log('throwing Error');
    throw new Error('test error');
  }
};

// This function is called when this instance is designated as the
// service provider. The port is created locally here but it could
// come from a different context, e.g. a Worker.
function portProvider() {
  log('appointed provider');
  return createSharedServicePort(target);
}

// Load the service worker.
navigator.serviceWorker.register('SharedService_ServiceWorker.js');

// Create the shared service.
log('start');
const sharedService = new SharedService('test-sw', portProvider);
sharedService.activate();

for (const button of Array.from(document.getElementsByTagName('button'))) {
  button.addEventListener('click', async () => {
    // Call the service.
    const op = button.getAttribute('data-op');
    const x = Math.trunc(Math.random() * 100);
    const y = Math.trunc(Math.random() * 100);
    log(`requesting ${op}(${x}, ${y})`);
    try {
      const result = await sharedService.proxy[op](x, y);
      log(`result ${result}`);
    } catch (e) {
      const text = e.stack.includes(e.message) ? e.stack : `${e.message}\n${e.stack}`;
      log(text);
    }
  });
}

function log(s) {
  const TIME_FORMAT = {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  };
  // @ts-ignore
  const timestamp = new Date().toLocaleTimeString(undefined, TIME_FORMAT);
  document.getElementById('output').textContent += `${timestamp} ${s}\n`;
}