      return nacl_raw.ready.then(function () {
        var nacl = nacl_cooked(nacl_raw);
        nacl.nacl_raw = nacl_raw;
        on_ready(nacl);
        return nacl;
      });
    })((typeof window !== 'undefined') ? window : undefined_reference_value,
       (typeof document !== 'undefined') ? document : undefined_reference_value);
  }
};

// export common.js module to allow one js file for browser and node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = nacl_factory;
}
