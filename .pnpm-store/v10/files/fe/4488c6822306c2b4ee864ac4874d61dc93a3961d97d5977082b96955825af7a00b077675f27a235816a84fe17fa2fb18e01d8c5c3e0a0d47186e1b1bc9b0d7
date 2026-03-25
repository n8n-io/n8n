let fs = require('fs');
let Task = require('./task').Task;

function isFileOrDirectory(t) {
  return (t instanceof FileTask ||
          t instanceof DirectoryTask);
}

function isFile(t) {
  return (t instanceof FileTask && !(t instanceof DirectoryTask));
}

/**
  @name jake
  @namespace jake
*/
/**
  @name jake.FileTask
  @class`
  @extentds Task
  @description A Jake FileTask

  @param {String} name The name of the Task
  @param {Array} [prereqs] Prerequisites to be run before this task
  @param {Function} [action] The action to perform to create this file
  @param {Object} [opts]
    @param {Array} [opts.asyc=false] Perform this task asynchronously.
    If you flag a task with this option, you must call the global
    `complete` method inside the task's action, for execution to proceed
    to the next task.
 */
class FileTask extends Task {
  constructor(...args) {
    super(...args);
    this.dummy = false;
    if (fs.existsSync(this.name)) {
      this.updateModTime();
    }
    else {
      this.modTime = null;
    }
  }

  isNeeded() {
    let prereqs = this.prereqs;
    let prereqName;
    let prereqTask;

    // No repeatsies
    if (this.taskStatus == Task.runStatuses.DONE) {
      return false;
    }
    // The always-make override
    else if (jake.program.opts['always-make']) {
      return true;
    }
    // Default case
    else {

      // We need either an existing file, or an action to create one.
      // First try grabbing the actual mod-time of the file
      try {
        this.updateModTime();
      }
      // Then fall back to looking for an action
      catch(e) {
        if (typeof this.action == 'function') {
          return true;
        }
        else {
          throw new Error('File-task ' + this.fullName + ' has no ' +
            'existing file, and no action to create one.');
        }
      }

      // Compare mod-time of all the prereqs with its mod-time
      // If any prereqs are newer, need to run the action to update
      if (prereqs && prereqs.length) {
        for (let i = 0, ii = prereqs.length; i < ii; i++) {
          prereqName = prereqs[i];
          prereqTask = this.namespace.resolveTask(prereqName) ||
            jake.createPlaceholderFileTask(prereqName, this.namespace);
          // Run the action if:
          // 1. The prereq is a normal task (not file/dir)
          // 2. The prereq is a file-task with a mod-date more recent than
          // the one for this file/dir
          if (prereqTask) {
            if (!isFileOrDirectory(prereqTask) ||
                (isFile(prereqTask) && prereqTask.modTime > this.modTime)) {
              return true;
            }
          }
        }
      }
      // File/dir has no prereqs, and exists -- no need to run
      else {
        // Effectively done
        this.taskStatus = Task.runStatuses.DONE;
        return false;
      }
    }
  }

  updateModTime() {
    let stats = fs.statSync(this.name);
    this.modTime = stats.mtime;
  }

  complete() {
    if (!this.dummy) {
      this.updateModTime();
    }
    // Hackity hack
    Task.prototype.complete.apply(this, arguments);
  }

}

exports.FileTask = FileTask;

// DirectoryTask is a subclass of FileTask, depends on it
// being defined
let DirectoryTask = require('./directory_task').DirectoryTask;

