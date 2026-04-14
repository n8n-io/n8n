/**
 * Lua scripts for atomic Redis operations in instance registry.
 *
 * All keys use the `{instance:}` hash tag to ensure they land in the same
 * Redis Cluster slot, enabling atomic multi-key operations via EVAL.
 */

/**
 * Atomically register an instance: SET key with TTL and SADD to membership set.
 *
 * KEYS[1] - Instance data key, e.g. `n8n:{instance:}main-abc123`
 * KEYS[2] - Membership set key, e.g. `n8n:{instance:}members`
 * ARGV[1] - JSON-serialized InstanceRegistration payload
 * ARGV[2] - TTL in seconds for the instance data key
 */
export const REGISTER_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
redis.call('SADD', KEYS[2], KEYS[1])
return 1
`;

/**
 * Atomically read all active registrations: SMEMBERS + batched MGET, filtering expired keys.
 * Batches MGET in chunks of 1000 to avoid Lua unpack() stack overflow (~7999 limit).
 *
 * KEYS[1] - Membership set key, e.g. `n8n:{instance:}members`
 *
 * Returns an array of JSON strings for all non-expired members.
 */
export const READ_ALL_SCRIPT = `
local members = redis.call('SMEMBERS', KEYS[1])
if #members == 0 then return {} end
local result = {}
local batch = 1000
for i = 1, #members, batch do
  local slice = {}
  for j = i, math.min(i + batch - 1, #members) do
    table.insert(slice, members[j])
  end
  local values = redis.call('MGET', unpack(slice))
  for _, v in ipairs(values) do
    if v ~= false then
      table.insert(result, v)
    end
  end
end
return result
`;

/**
 * Atomically clean up stale membership entries whose data keys have expired.
 * Batches MGET in chunks of 1000 to avoid Lua unpack() stack overflow (~7999 limit).
 *
 * KEYS[1] - Membership set key, e.g. `n8n:{instance:}members`
 *
 * Returns the number of stale entries removed from the membership set.
 */
export const CLEANUP_SCRIPT = `
local members = redis.call('SMEMBERS', KEYS[1])
if #members == 0 then return 0 end
local removed = 0
local batch = 1000
for i = 1, #members, batch do
  local slice = {}
  for j = i, math.min(i + batch - 1, #members) do
    table.insert(slice, members[j])
  end
  local values = redis.call('MGET', unpack(slice))
  for k, v in ipairs(values) do
    if v == false then
      redis.call('SREM', KEYS[1], members[i + k - 1])
      removed = removed + 1
    end
  end
end
return removed
`;

/**
 * Atomically unregister an instance: DEL data key and SREM from membership set.
 *
 * KEYS[1] - Instance data key, e.g. `n8n:{instance:}main-abc123`
 * KEYS[2] - Membership set key, e.g. `n8n:{instance:}members`
 */
export const UNREGISTER_SCRIPT = `
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], KEYS[1])
return 1
`;
