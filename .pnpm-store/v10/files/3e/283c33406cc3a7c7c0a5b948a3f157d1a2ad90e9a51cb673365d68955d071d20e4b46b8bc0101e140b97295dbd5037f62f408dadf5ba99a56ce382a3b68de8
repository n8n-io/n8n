var nacl_factory = {
  instantiate: function (on_ready, optionsOpt) {
    var options = optionsOpt || {};
    var undefined_reference_value = (function (v) { return v; })();
    var requested_total_memory = options.requested_total_memory || undefined_reference_value;

    if (typeof on_ready !== 'function') {
      throw new Error("nacl_factory: Expects on_ready callback as first argument. New in v1.1.0.");
    }

    return (function (window, document) {
      var Module = {
        TOTAL_MEMORY: requested_total_memory
      };
      var nacl_raw = Module;
