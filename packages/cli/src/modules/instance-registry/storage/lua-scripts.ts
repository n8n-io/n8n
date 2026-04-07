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
 * Atomically read all active registrations: SMEMBERS + MGET, filtering expired keys.
 *
 * KEYS[1] - Membership set key, e.g. `n8n:{instance:}members`
 *
 * Returns an array of JSON strings for all non-expired members.
 */
export const READ_ALL_SCRIPT = `
local members = redis.call('SMEMBERS', KEYS[1])
if #members == 0 then return {} end
local values = redis.call('MGET', unpack(members))
local result = {}
for i, v in ipairs(values) do
  if v ~= false then
    table.insert(result, v)
  end
end
return result
`;

/**
 * Atomically clean up stale membership entries whose data keys have expired.
 *
 * KEYS[1] - Membership set key, e.g. `n8n:{instance:}members`
 *
 * Returns the number of stale entries removed from the membership set.
 */
export const CLEANUP_SCRIPT = `
local members = redis.call('SMEMBERS', KEYS[1])
if #members == 0 then return 0 end
local values = redis.call('MGET', unpack(members))
local removed = 0
for i, v in ipairs(values) do
  if v == false then
    redis.call('SREM', KEYS[1], members[i])
    removed = removed + 1
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
