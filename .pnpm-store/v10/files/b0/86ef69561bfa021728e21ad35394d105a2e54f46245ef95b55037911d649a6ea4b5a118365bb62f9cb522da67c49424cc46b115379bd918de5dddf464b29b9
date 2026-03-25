const ROOT_NAMESPACE_NAME = '__rootNamespace__';

class Namespace {
  constructor(name, parentNamespace) {
    this.name = name;
    this.parentNamespace = parentNamespace;
    this.childNamespaces = {};
    this.tasks = {};
    this.rules = {};
    this.path = this.getPath();
  }

  get fullName() {
    return this._getFullName();
  }

  addTask(task) {
    this.tasks[task.name] = task;
    task.namespace = this;
  }

  resolveTask(name) {
    if (!name) {
      return;
    }

    let taskPath = name.split(':');
    let taskName = taskPath.pop();
    let task;
    let ns;

    // Namespaced, return either relative to current, or from root
    if (taskPath.length) {
      taskPath = taskPath.join(':');
      ns = this.resolveNamespace(taskPath) ||
        Namespace.ROOT_NAMESPACE.resolveNamespace(taskPath);
      task = (ns && ns.resolveTask(taskName));
    }
    // Bare task, return either local, or top-level
    else {
      task = this.tasks[name] || Namespace.ROOT_NAMESPACE.tasks[name];
    }

    return task || null;
  }


  resolveNamespace(relativeName) {
    if (!relativeName) {
      return this;
    }

    let parts = relativeName.split(':');
    let ns = this;

    for (let i = 0, ii = parts.length; (ns && i < ii); i++) {
      ns = ns.childNamespaces[parts[i]];
    }

    return ns || null;
  }

  matchRule(relativeName) {
    let parts = relativeName.split(':');
    parts.pop();
    let ns = this.resolveNamespace(parts.join(':'));
    let rules = ns ? ns.rules : [];
    let r;
    let match;

    for (let p in rules) {
      r = rules[p];
      if (r.match(relativeName)) {
        match = r;
      }
    }

    return (ns && match) ||
        (this.parentNamespace &&
        this.parentNamespace.matchRule(relativeName));
  }

  getPath() {
    let parts = [];
    let next = this.parentNamespace;
    while (next) {
      parts.push(next.name);
      next = next.parentNamespace;
    }
    parts.pop(); // Remove '__rootNamespace__'
    return parts.reverse().join(':');
  }

  _getFullName() {
    let path = this.path;
    path = (path && path.split(':')) || [];
    path.push(this.name);
    return path.join(':');
  }

  isRootNamespace() {
    return !this.parentNamespace;
  }
}

class RootNamespace extends Namespace {
  constructor() {
    super(ROOT_NAMESPACE_NAME, null);
    Namespace.ROOT_NAMESPACE = this;
  }
}

module.exports.Namespace = Namespace;
module.exports.RootNamespace = RootNamespace;

