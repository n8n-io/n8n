// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

(function () {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      switch (mutation.type) {
        case 'attributes':
          // Don't report our own attribute has changed.
          if (mutation.attributeName === "data-__webdriver_id") {
            break;
          }
          const curr = mutation.target.getAttribute(mutation.attributeName);
          var id = mutation.target.dataset.__webdriver_id
          if (!id) {
            id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            mutation.target.dataset.__webdriver_id = id;
          }
          const json = JSON.stringify({
            'target': id,
            'name': mutation.attributeName,
            'value': curr,
            'oldValue': mutation.oldValue
          });
          __webdriver_attribute(json);
          break;
        default:
          break;
      }
    }
  });

  observer.observe(document, {
    'attributes': true,
    'attributeOldValue': true,
    'characterData': true,
    'characterDataOldValue': true,
    'childList': true,
    'subtree': true
  });
})();
