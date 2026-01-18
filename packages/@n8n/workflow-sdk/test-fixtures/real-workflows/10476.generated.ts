return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: 'c851e840-457c-4050-8803-4e6d258580e1',
      options: {},
      httpMethod: 'POST'
    }, position: [-336, -848] } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.body.msg }}',
      chatId: '123456789',
      replyMarkup: 'replyKeyboard',
      additionalFields: { appendAttribution: false, reply_to_message_id: 0 },
      replyKeyboardOptions: {}
    }, position: [112, -944], name: 'OK Message' } }), node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.body.monitor.docker_container }} reported an issue : {{ $json.body.heartbeat.msg }} at {{ $json.body.heartbeat.time }}',
      chatId: '123456789',
      replyMarkup: 'replyKeyboard',
      replyKeyboard: {
        rows: [
          {
            row: {
              buttons: [
                {
                  text: '={{ $json.body.monitor.docker_container }} Logs',
                  additionalFields: {}
                },
                {
                  text: '={{ $json.body.monitor.docker_container }} Restart',
                  additionalFields: {}
                }
              ]
            }
          }
        ]
      },
      additionalFields: { appendAttribution: false, reply_to_message_id: 0 },
      replyKeyboardOptions: {}
    }, position: [112, -752], name: 'ERROR Message' } })], { version: 3.3, parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '5f956f73-4789-4fae-bedc-7c1f0edfc2d2',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json.body.heartbeat.msg }}',
                  rightValue: 'running'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'd1ec668d-53e8-44b2-9cb6-6a4de3bcec07',
                  operator: { type: 'string', operation: 'notEquals' },
                  leftValue: '={{ $json.body.heartbeat.msg }}',
                  rightValue: 'running'
                }
              ]
            }
          }
        ]
      },
      options: {}
    }, name: 'Switch1' }))
  .add(trigger({ type: 'n8n-nodes-base.telegramTrigger', version: 1.2, config: { parameters: { updates: ['message'], additionalFields: {} }, position: [-304, -336] } }))
  .add(node({ type: 'n8n-nodes-base.switch', version: 3.3, config: { parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'a4f85833-5791-4513-bef5-f31c582bf26a',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $json.message.text.toLowerCase() }}',
                  rightValue: 'logs'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '52a99c27-c2bb-49b5-9ca9-27c3de1aa9ac',
                  operator: { type: 'string', operation: 'contains' },
                  leftValue: '={{ $json.message.text.toLowerCase() }}',
                  rightValue: 'restart'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'f12f78c4-e959-4e50-9b1d-2a605169387d',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.message.text.toLowerCase() }}',
                  rightValue: 'status'
                }
              ]
            }
          },
          {
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '3e13d044-3bfe-4669-a107-ace1b573240e',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json.message.text.toLowerCase() }}',
                  rightValue: 'update'
                }
              ]
            }
          }
        ]
      },
      options: {}
    }, position: [16, 80] } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: {
      mode: 'combine',
      options: {},
      combineBy: 'combineByPosition'
    }, position: [640, -368] } }))
  .then(node({ type: 'n8n-nodes-base.ssh', version: 1, config: { parameters: {
      cwd: '',
      command: '=docker logs --tail 100 {{ $json.service_name }}'
    }, position: [864, -368], name: 'get logs' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Analyzing Log File...',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, position: [1088, -368], name: 'Status Update' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.openAi', version: 2, config: { parameters: {
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'gpt-4.1-mini',
        cachedResultName: 'GPT-4.1-MINI'
      },
      options: {},
      responses: {
        values: [
          {
            role: 'system',
            content: 'You are a senior IT specialist experienced in debugging distributed systems, containers, Linux services, and application logs. When the user provides log output or an error message, you must:\n\nAnalyze the logs carefully and respond in a structured format:\n\nSummary\nShort, concise explanation of what\'s happening.\n\nMost Likely Root Cause\nOne clear sentence. If unknown, say so and state what’s missing.\n\nImpact\nExplain if functionality is broken, partially limited, or unaffected.\n\nKey Evidence From Logs\nList only the relevant log lines and briefly explain each.\n\nSeverity Level\nRate 1–5 (1 negligible, 5 critical). Include a one-line justification.\n\nRecommended Next Steps\nBullet actionable steps. Include different paths if needed (example: “If you use USB devices…”).\n\nFollow-up / What to Monitor\nOne or two items the user should watch for or collect next.\n\nGuidelines:\n\nBe concise and structured. No long essays.\n\nNever just quote logs back. Interpret them.\n\nIf assumptions are required, state them explicitly.\n\nIf the logs do not contain enough info, say so and request specifics.\n\nTone should be calm, confident, and clear like a senior engineer helping a teammate.\n\nAvoid unnecessary technical jargon unless required.\n\nFocus on actionable clarity.'
          },
          { content: '={{ $(\'get logs\').item.json.stdout }}' }
        ]
      },
      builtInTools: {}
    }, position: [1312, -368], name: 'Message a model' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.output[0].content[0].text }}',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, position: [1664, -368], name: 'Log Analysis' } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: {
      mode: 'combine',
      options: {},
      combineBy: 'combineByPosition'
    }, position: [640, 0], name: 'Merge1' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Attempting to restart...',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, position: [864, 0], name: 'Restart Message' } }))
  .then(node({ type: 'n8n-nodes-base.ssh', version: 1, config: { parameters: {
      cwd: '',
      command: '=docker restart {{ $(\'Merge1\').item.json.service_name }}'
    }, position: [1088, 0], name: 'restart container' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Successfull restarting {{ $json.stdout }}',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, position: [1664, -96], name: 'Success restart' } }), node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Restart failed\n{{ $(\'restart container\').item.json.stderr }}',
      chatId: '123456789',
      additionalFields: { appendAttribution: false }
    }, position: [1664, 96], name: 'Restart Failed' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'and',
        conditions: [
          {
            id: '30a53424-65b9-4a9b-a4cd-e78933c8441b',
            operator: { type: 'string', operation: 'empty', singleValue: true },
            leftValue: '={{ $json.stderr }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'If' }))
  .add(node({ type: 'n8n-nodes-base.ssh', version: 1, config: { parameters: {
      cwd: '',
      command: 'docker ps --format "{{.Names}}\\t{{.Status}}"'
    }, position: [448, 448], name: 'docker ps' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.stdout }}',
      chatId: '123456789',
      additionalFields: { parse_mode: 'HTML', appendAttribution: false }
    }, position: [672, 448], name: 'Docker Status' } }))
  .add(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '=Running Update...',
      chatId: '123456789',
      additionalFields: { parse_mode: 'HTML', appendAttribution: false }
    }, position: [400, 848], name: 'Update Msg' } }))
  .then(node({ type: 'n8n-nodes-base.ssh', version: 1, config: { parameters: { cwd: '', command: './update-all-docker-compose.sh' }, position: [624, 848], name: 'Update Docker' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      language: 'python',
      pythonCode: 'import re\nimport json\n\ndef extract_update_summary(stdout):\n    match = re.search(r\'Update Summary:\\n({.*?\\})\', stdout, re.DOTALL)\n    if not match:\n        return {}\n    update_json = match.group(1)\n    update_json_clean = re.sub(r\',\\s*([\\]\\}])\', r\'\\1\', update_json)\n    return json.loads(update_json_clean)\n\ndef format_update_message(update_summary):\n    status_parts = []\n    for compose_file, updates in update_summary.items():\n        service = compose_file.replace(\'-compose.yaml\', \'\')\n        if updates == ["none"]:\n            status_parts.append(f"{service}: No updates")\n        else:\n            status_parts.append(f"{service}: Updated ({\', \'.join(updates)})")\n    return "; ".join(status_parts)\n\n# n8n passes items as a list of dicts; get the "stdout" field from the input\nstdout = _input.first().json.stdout\nupdate_summary = extract_update_summary(stdout)\nmessage = format_update_message(update_summary)\nreturn [{"message": message}]\n'
    }, position: [848, 848], name: 'Code in Python (Beta)' } }))
  .then(node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { parameters: {
      text: '={{ $json.message }}',
      chatId: '123456789',
      additionalFields: { parse_mode: 'HTML', appendAttribution: false }
    }, position: [1136, 848], name: 'Update Msg1' } }))
  .add(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      language: 'python',
      pythonCode: 'def extract_service_name(message):\n    # Split by spaces\n    parts = message.split()\n    # Take the first part (service name)\n    if parts:\n        return parts[0]\n    else:\n        return \'\'\n\n# Example usage:\nincoming_message = _input.first().json.message.text\nservice_name = extract_service_name(incoming_message)\nreturn {\n    "service_name": service_name\n}'
    }, position: [400, -368], name: 'Extract the Service Name' } }))
  .add(sticky('## Incoming Webhook\n\nuse a webhook from tools like Uptime Kuma', { position: [-400, -1008], height: 384 }))
  .add(sticky('## User Interaction\n\nAllow users to triggers events directly from Telegram', { name: 'Sticky Note1', position: [-400, -448], width: 352, height: 304 }))
  .add(sticky('## Issue Analyzer\nAutomatically analyse the log file for a docker container and provide feedback to the user', { name: 'Sticky Note2', position: [384, -496], width: 1488, height: 320 }))
  .add(sticky('## Docker Restart Service\nAutomatically restart a given docker container', { name: 'Sticky Note3', position: [368, -112], width: 1488, height: 352 }))
  .add(sticky('## Allow the user to get all current deployed docker container\n', { name: 'Sticky Note4', position: [368, 320], width: 752, height: 352 }))
  .add(sticky('## Automatically update all docker images on the server', { name: 'Sticky Note5', position: [368, 720], width: 1232, height: 352 }))
  .add(sticky('## Custom Script for your Docker server\n\n\'\'bash\nProcessing hompage-compose.yaml\n  GNU nano 7.2                                                                update-all-docker-compose.sh\n#!/bin/bash\ndeclare -A UPDATED_CONTAINERS\nN8N_FILE="n8n-compose.yaml"  # Adjust to your n8n compose filename\n\nfor file in *-compose.yaml; do\n  if [[ "$file" == "$N8N_FILE" ]]; then\n    echo "Skipping $file (n8n instance)"\n    continue\n  fi\n\n  echo "Processing $file"\n  UPDATED_IMAGES=()\n\n  OUTPUT=$(docker compose -f "$file" pull 2>&1)\n  echo "$OUTPUT"\n\n  while IFS= read -r line; do\n    if [[ $line =~ "Downloaded newer image" ]]; then\n      IMAGE=$(echo "$line" | awk \'{print $2}\')\n      UPDATED_IMAGES+=("$IMAGE: updated")\n    elif [[ $line =~ "Image is up to date" ]]; then\n      IMAGE=$(echo "$line" | awk \'{print $2}\')\n      UPDATED_IMAGES+=("$IMAGE: already up-to-date")\n    fi\n  done <<< "$OUTPUT"\n\n  docker compose -f "$file" up -d\n\n  UPDATED_CONTAINERS["$file"]=${UPDATED_IMAGES[@]:-none}\ndone\n\necho "Update Summary:"\necho "{"\nfor file in "${!UPDATED_CONTAINERS[@]}"; do\n  echo "  \\"$file\\": ["\n  for status in ${UPDATED_CONTAINERS[$file]}; do\n    echo "    \\"$status\\","\n  done\n  echo "  ],"\ndone\necho "}"\n\'\'', { name: 'Sticky Note6', position: [368, 1104], width: 464, height: 944 }))