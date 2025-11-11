// Content script to auto-fill the Interest rate filter
(function() {
  'use strict';

  // Configuration
  const TARGET_VALUE = '12';
  const MAX_ATTEMPTS = 30; // Try for 15 seconds (30 * 500ms)
  const RETRY_DELAY = 500; // ms

  // Function to find and fill the interest rate input
  function findAndFillInterestRate() {
    // Strategy 1: Look for input by label text
    const labels = document.querySelectorAll('label');
    for (let label of labels) {
      if (label.textContent.toLowerCase().includes('interest rate')) {
        const input = document.getElementById(label.getAttribute('for')) ||
                     label.querySelector('input, select');
        if (input) {
          return fillInput(input);
        }
      }
    }

    // Strategy 2: Look for inputs with matching name/id/placeholder
    const selectors = [
      'input[name*="interest" i]',
      'input[id*="interest" i]',
      'input[placeholder*="interest" i]',
      'select[name*="interest" i]',
      'select[id*="interest" i]',
      '[data-test*="interest" i]',
      '[aria-label*="interest rate" i]'
    ];

    for (let selector of selectors) {
      const input = document.querySelector(selector);
      if (input) {
        return fillInput(input);
      }
    }

    // Strategy 3: Look for any input near text containing "interest rate"
    const allText = document.body.innerText.toLowerCase();
    if (allText.includes('interest rate')) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes('interest rate')) {
          let parent = node.parentElement;
          while (parent && parent !== document.body) {
            const input = parent.querySelector('input, select');
            if (input && (input.type === 'text' || input.type === 'number' || input.tagName === 'SELECT')) {
              return fillInput(input);
            }
            parent = parent.parentElement;
          }
        }
      }
    }

    return false;
  }

  // Function to fill an input and trigger necessary events
  function fillInput(input) {
    if (!input) return false;

    console.log('Found interest rate input:', input);

    // Set the value
    input.value = TARGET_VALUE;

    // Trigger events that the framework might be listening to
    const events = ['input', 'change', 'blur', 'keyup'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      input.dispatchEvent(event);
    });

    // For Vue/React/Angular frameworks, also trigger native setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    nativeInputValueSetter.call(input, TARGET_VALUE);

    const inputEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(inputEvent);

    console.log('Interest rate filled with:', TARGET_VALUE);
    return true;
  }

  // Retry mechanism for SPA content loading
  let attempts = 0;
  function tryFillInterestRate() {
    attempts++;

    if (findAndFillInterestRate()) {
      console.log('Successfully filled interest rate filter');
      return;
    }

    if (attempts < MAX_ATTEMPTS) {
      setTimeout(tryFillInterestRate, RETRY_DELAY);
    } else {
      console.warn('Could not find interest rate input after', attempts, 'attempts');
      console.log('You may need to manually adjust the selectors in content.js');
    }
  }

  // Start trying when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryFillInterestRate);
  } else {
    // DOM already loaded
    setTimeout(tryFillInterestRate, 1000); // Give Nuxt.js a moment to render
  }

})();
