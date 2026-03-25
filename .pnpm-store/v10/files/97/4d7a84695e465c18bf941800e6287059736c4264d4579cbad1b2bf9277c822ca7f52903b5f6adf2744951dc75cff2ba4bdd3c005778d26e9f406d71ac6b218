language: node_js
node_js:
  - "10"
  - "8"
  - "6"
  - "4"
script:
  - "npm run test-travis"
after_script:
  - "npm install coveralls@2.11.x && cat coverage/lcov.info | coveralls"
