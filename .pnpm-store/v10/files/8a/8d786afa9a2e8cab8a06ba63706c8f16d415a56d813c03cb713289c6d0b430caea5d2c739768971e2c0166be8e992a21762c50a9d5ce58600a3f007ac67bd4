//
// TDigest:
//
// approximate distribution percentiles from a stream of reals
//
var RBTree = require('bintrees').RBTree;

function TDigest(delta, K, CX) {
    // allocate a TDigest structure.
    //
    // delta is the compression factor, the max fraction of mass that
    // can be owned by one centroid (bigger, up to 1.0, means more
    // compression). delta=false switches off TDigest behavior and treats
    // the distribution as discrete, with no merging and exact values
    // reported.
    //
    // K is a size threshold that triggers recompression as the TDigest
    // grows during input.  (Set it to 0 to disable automatic recompression)
    //
    // CX specifies how often to update cached cumulative totals used
    // for quantile estimation during ingest (see cumulate()).  Set to
    // 0 to use exact quantiles for each new point.
    //
    this.discrete = (delta === false);
    this.delta = delta || 0.01;
    this.K = (K === undefined) ? 25 : K;
    this.CX = (CX === undefined) ? 1.1 : CX;
    this.centroids = new RBTree(compare_centroid_means);
    this.nreset = 0;
    this.reset();
}

TDigest.prototype.reset = function() {
    // prepare to digest new points.
    //
    this.centroids.clear();
    this.n = 0;
    this.nreset += 1;
    this.last_cumulate = 0;
};

TDigest.prototype.size = function() {
    return this.centroids.size;
};

TDigest.prototype.toArray = function(everything) {
    // return {mean,n} of centroids as an array ordered by mean.
    //
    var result = [];
    if (everything) {
        this._cumulate(true); // be sure cumns are exact
        this.centroids.each(function(c) { result.push(c); });
    } else {
        this.centroids.each(function(c) { result.push({mean:c.mean, n:c.n}); });
    }
    return result;
};

TDigest.prototype.summary = function() {
    var approx = (this.discrete) ? "exact " : "approximating ";
    var s = [approx + this.n + " samples using " + this.size() + " centroids",
             "min = "+this.percentile(0),
             "Q1  = "+this.percentile(0.25),
             "Q2  = "+this.percentile(0.5),
             "Q3  = "+this.percentile(0.75),
             "max = "+this.percentile(1.0)];
    return s.join('\n');
};

function compare_centroid_means(a, b) {
    // order two centroids by mean.
    //
    return (a.mean > b.mean) ? 1 : (a.mean < b.mean) ? -1 : 0;
}

function compare_centroid_mean_cumns(a, b) {
    // order two centroids by mean_cumn.
    //
    return (a.mean_cumn - b.mean_cumn);
}

TDigest.prototype.push = function(x, n) {
    // incorporate value or array of values x, having count n into the
    // TDigest. n defaults to 1.
    //
    n = n || 1;
    x = Array.isArray(x) ? x : [x];
    for (var i = 0 ; i < x.length ; i++) {
        this._digest(x[i], n);
    }
};

TDigest.prototype.push_centroid = function(c) {
    // incorporate centroid or array of centroids c
    //
    c = Array.isArray(c) ? c : [c];
    for (var i = 0 ; i < c.length ; i++) {
        this._digest(c[i].mean, c[i].n);
    }
};

TDigest.prototype._cumulate = function(exact) {
    // update cumulative counts for each centroid
    //
    // exact: falsey means only cumulate after sufficient
    // growth. During ingest, these counts are used as quantile
    // estimates, and they work well even when somewhat out of
    // date. (this is a departure from the publication, you may set CX
    // to 0 to disable).
    //
    if (this.n === this.last_cumulate ||
        !exact && this.CX && this.CX > (this.n / this.last_cumulate)) {
        return;
    }
    var cumn = 0;
    this.centroids.each(function(c) {
        c.mean_cumn = cumn + c.n / 2; // half of n at the mean
        cumn = c.cumn = cumn + c.n;
    });
    this.n = this.last_cumulate = cumn;
};

TDigest.prototype.find_nearest = function(x) {
    // find the centroid closest to x. The assumption of
    // unique means and a unique nearest centroid departs from the
    // paper, see _digest() below
    //
    if (this.size() === 0) {
        return null;
    }
    var iter = this.centroids.lowerBound({mean:x}); // x <= iter || iter==null
    var c = (iter.data() === null) ? iter.prev() : iter.data();
    if (c.mean === x || this.discrete) {
        return c; // c is either x or a neighbor (discrete: no distance func)
    }
    var prev = iter.prev();
    if (prev && Math.abs(prev.mean - x) < Math.abs(c.mean - x)) {
        return prev;
    } else {
        return c;
    }
};

TDigest.prototype._new_centroid = function(x, n, cumn) {
    // create and insert a new centroid into the digest (don't update
    // cumulatives).
    //
    var c = {mean:x, n:n, cumn:cumn};
    this.centroids.insert(c);
    this.n += n;
    return c;
};

TDigest.prototype._addweight = function(nearest, x, n) {
    // add weight at location x to nearest centroid.  adding x to
    // nearest will not shift its relative position in the tree and
    // require reinsertion.
    //
    if (x !== nearest.mean) {
        nearest.mean += n * (x - nearest.mean) / (nearest.n + n);
    }
    nearest.cumn += n;
    nearest.mean_cumn += n / 2;
    nearest.n += n;
    this.n += n;
};

TDigest.prototype._digest = function(x, n) {
    // incorporate value x, having count n into the TDigest.
    //
    var min = this.centroids.min();
    var max = this.centroids.max();
    var nearest = this.find_nearest(x);
    if (nearest && nearest.mean === x) {
        // accumulate exact matches into the centroid without
        // limit. this is a departure from the paper, made so
        // centroids remain unique and code can be simple.
        this._addweight(nearest, x, n);
    } else if (nearest === min) {
        this._new_centroid(x, n, 0); // new point around min boundary
    } else if (nearest === max ) {
        this._new_centroid(x, n, this.n); // new point around max boundary
    } else if (this.discrete) {
        this._new_centroid(x, n, nearest.cumn); // never merge
    } else {
        // conider a merge based on nearest centroid's capacity. if
        // there's not room for all of n, don't bother merging any of
        // it into nearest, as we'll have to make a new centroid
        // anyway for the remainder (departure from the paper).
        var p = nearest.mean_cumn / this.n;
        var max_n = Math.floor(4 * this.n * this.delta * p * (1 - p));
        if (max_n - nearest.n >= n) {
            this._addweight(nearest, x, n);
        } else {
            this._new_centroid(x, n, nearest.cumn);
        }
    }
    this._cumulate(false);
    if (!this.discrete && this.K && this.size() > this.K / this.delta) {
        // re-process the centroids and hope for some compression.
        this.compress();
    }
};

TDigest.prototype.bound_mean = function(x) {
    // find centroids lower and upper such that lower.mean < x <
    // upper.mean or lower.mean === x === upper.mean. Don't call
    // this for x out of bounds.
    //
    var iter = this.centroids.upperBound({mean:x}); // x < iter
    var lower = iter.prev();      // lower <= x
    var upper = (lower.mean === x) ? lower : iter.next();
    return [lower, upper];
};

TDigest.prototype.p_rank = function(x_or_xlist) {
    // return approximate percentile-ranks (0..1) for data value x.
    // or list of x.  calculated according to
    // https://en.wikipedia.org/wiki/Percentile_rank
    //
    // (Note that in continuous mode, boundary sample values will
    // report half their centroid weight inward from 0/1 as the
    // percentile-rank. X values outside the observed range return
    // 0/1)
    //
    // this triggers cumulate() if cumn's are out of date.
    //
    var xs = Array.isArray(x_or_xlist) ? x_or_xlist : [x_or_xlist];
    var ps = xs.map(this._p_rank, this);
    return Array.isArray(x_or_xlist) ? ps : ps[0];
};

TDigest.prototype._p_rank = function(x) {
    if (this.size() === 0) {
        return undefined;
    } else if (x < this.centroids.min().mean) {
        return 0.0;
    } else if (x > this.centroids.max().mean) {
        return 1.0;
    }
    // find centroids that bracket x and interpolate x's cumn from
    // their cumn's.
    this._cumulate(true); // be sure cumns are exact
    var bound = this.bound_mean(x);
    var lower = bound[0], upper = bound[1];
    if (this.discrete) {
        return lower.cumn / this.n;
    } else {
        var cumn = lower.mean_cumn;
        if (lower !== upper) {
            cumn += (x - lower.mean) * (upper.mean_cumn - lower.mean_cumn) / (upper.mean - lower.mean);
        }
        return cumn / this.n;
    }
};

TDigest.prototype.bound_mean_cumn = function(cumn) {
    // find centroids lower and upper such that lower.mean_cumn < x <
    // upper.mean_cumn or lower.mean_cumn === x === upper.mean_cumn. Don't call
    // this for cumn out of bounds.
    //
    // XXX because mean and mean_cumn give rise to the same sort order
    // (up to identical means), use the mean rbtree for our search.
    this.centroids._comparator = compare_centroid_mean_cumns;
    var iter = this.centroids.upperBound({mean_cumn:cumn}); // cumn < iter
    this.centroids._comparator = compare_centroid_means;
    var lower = iter.prev();      // lower <= cumn
    var upper = (lower && lower.mean_cumn === cumn) ? lower : iter.next();
    return [lower, upper];
};

TDigest.prototype.percentile = function(p_or_plist) {
    // for percentage p (0..1), or for each p in a list of ps, return
    // the smallest data value q at which at least p percent of the
    // observations <= q.
    //
    // for discrete distributions, this selects q using the Nearest
    // Rank Method
    // (https://en.wikipedia.org/wiki/Percentile#The_Nearest_Rank_method)
    // (in scipy, same as percentile(...., interpolation='higher')
    //
    // for continuous distributions, interpolates data values between
    // count-weighted bracketing means.
    //
    // this triggers cumulate() if cumn's are out of date.
    //
    var ps = Array.isArray(p_or_plist) ? p_or_plist : [p_or_plist];
    var qs = ps.map(this._percentile, this);
    return Array.isArray(p_or_plist) ? qs : qs[0];
};

TDigest.prototype._percentile = function(p) {
    if (this.size() === 0) {
        return undefined;
    }
    this._cumulate(true); // be sure cumns are exact
    var h = this.n * p;
    var bound = this.bound_mean_cumn(h);
    var lower = bound[0], upper = bound[1];

    if (upper === lower || lower === null || upper === null) {
        return (lower || upper).mean;
    } else if (!this.discrete) {
        return lower.mean + (h - lower.mean_cumn) * (upper.mean - lower.mean) / (upper.mean_cumn - lower.mean_cumn);
    } else if (h <= lower.cumn) {
        return lower.mean;
    } else {
        return upper.mean;
    }
};

function pop_random(choices) {
    // remove and return an item randomly chosen from the array of choices
    // (mutates choices)
    //
    var idx = Math.floor(Math.random() * choices.length);
    return choices.splice(idx, 1)[0];
}

TDigest.prototype.compress = function() {
    // TDigests experience worst case compression (none) when input
    // increases monotonically.  Improve on any bad luck by
    // reconsuming digest centroids as if they were weighted points
    // while shuffling their order (and hope for the best).
    //
    if (this.compressing) {
        return;
    }
    var points = this.toArray();
    this.reset();
    this.compressing = true;
    while (points.length > 0) {
        this.push_centroid(pop_random(points));
    }
    this._cumulate(true);
    this.compressing = false;
};

function Digest(config) {
    // allocate a distribution digest structure. This is an extension
    // of a TDigest structure that starts in exact histogram (discrete)
    // mode, and automatically switches to TDigest mode for large
    // samples that appear to be from a continuous distribution.
    //
    this.config = config || {};
    this.mode = this.config.mode || 'auto'; // disc, cont, auto
    TDigest.call(this, this.mode === 'cont' ? config.delta : false);
    this.digest_ratio = this.config.ratio || 0.9;
    this.digest_thresh = this.config.thresh || 1000;
    this.n_unique = 0;
}
Digest.prototype = Object.create(TDigest.prototype);
Digest.prototype.constructor = Digest;

Digest.prototype.push = function(x_or_xlist) {
    TDigest.prototype.push.call(this, x_or_xlist);
    this.check_continuous();
};

Digest.prototype._new_centroid = function(x, n, cumn) {
    this.n_unique += 1;
    TDigest.prototype._new_centroid.call(this, x, n, cumn);
};

Digest.prototype._addweight = function(nearest, x, n) {
    if (nearest.n === 1) {
        this.n_unique -= 1;
    }
    TDigest.prototype._addweight.call(this, nearest, x, n);
};

Digest.prototype.check_continuous = function() {
    // while in 'auto' mode, if there are many unique elements, assume
    // they are from a continuous distribution and switch to 'cont'
    // mode (tdigest behavior). Return true on transition from
    // disctete to continuous.
    if (this.mode !== 'auto' || this.size() < this.digest_thresh) {
        return false;
    }
    if (this.n_unique / this.size() > this.digest_ratio) {
        this.mode = 'cont';
        this.discrete = false;
        this.delta = this.config.delta || 0.01;
        this.compress();
        return true;
    }
    return false;
};

module.exports = {
    'TDigest': TDigest,
    'Digest': Digest
};
